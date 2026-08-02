import { and, asc, desc, eq, inArray } from "drizzle-orm";
import {
  db,
  addressesTable,
  billItemsTable,
  bookingsTable,
  categoriesTable,
  membersTable,
  providersTable,
  servicesTable,
  statementsTable,
} from "@workspace/db";

export const STATUS_CHAIN = [
  "pending",
  "confirmed",
  "en_route",
  "arrived",
  "in_progress",
  "completed",
] as const;

export const LIVE_STATUSES = [
  "confirmed",
  "en_route",
  "arrived",
  "in_progress",
];

export function currentMonthLabel(): string {
  return new Date().toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Dubai",
  });
}

const bookingSelection = {
  id: bookingsTable.id,
  providerId: bookingsTable.providerId,
  providerName: providersTable.name,
  serviceId: bookingsTable.serviceId,
  serviceName: servicesTable.name,
  categoryName: categoriesTable.name,
  categoryIcon: categoriesTable.icon,
  memberId: bookingsTable.memberId,
  memberName: membersTable.name,
  addressId: bookingsTable.addressId,
  addressLabel: addressesTable.label,
  scheduledAt: bookingsTable.scheduledAt,
  status: bookingsTable.status,
  priceEstimate: bookingsTable.priceEstimate,
  instructions: bookingsTable.instructions,
  etaMinutes: bookingsTable.etaMinutes,
  createdAt: bookingsTable.createdAt,
};

function bookingQuery() {
  return db
    .select(bookingSelection)
    .from(bookingsTable)
    .innerJoin(providersTable, eq(bookingsTable.providerId, providersTable.id))
    .innerJoin(servicesTable, eq(bookingsTable.serviceId, servicesTable.id))
    .innerJoin(membersTable, eq(bookingsTable.memberId, membersTable.id))
    .innerJoin(addressesTable, eq(bookingsTable.addressId, addressesTable.id))
    .innerJoin(
      categoriesTable,
      eq(providersTable.categoryId, categoriesTable.id),
    );
}

export type BookingView = Awaited<ReturnType<typeof bookingQuery>>[number];

export async function fetchBookingViews(opts?: {
  statuses?: string[];
  order?: "asc" | "desc";
}): Promise<BookingView[]> {
  let query = bookingQuery().$dynamic();
  if (opts?.statuses && opts.statuses.length > 0) {
    query = query.where(inArray(bookingsTable.status, opts.statuses));
  }
  query = query.orderBy(
    opts?.order === "desc"
      ? desc(bookingsTable.scheduledAt)
      : asc(bookingsTable.scheduledAt),
  );
  return query;
}

export async function fetchBookingView(
  id: number,
): Promise<BookingView | undefined> {
  const rows = await bookingQuery().where(eq(bookingsTable.id, id));
  return rows[0];
}

export async function getCurrentMember() {
  const [member] = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.isCurrentUser, true));
  return member;
}

export async function getHouseholdId(): Promise<number> {
  const member = await getCurrentMember();
  if (!member) {
    throw new Error("No current member seeded");
  }
  return member.householdId;
}

export async function ensureOpenStatement(householdId: number) {
  const [open] = await db
    .select()
    .from(statementsTable)
    .where(
      and(
        eq(statementsTable.householdId, householdId),
        eq(statementsTable.status, "open"),
      ),
    )
    .orderBy(desc(statementsTable.id))
    .limit(1);
  if (open) {
    return open;
  }
  const [created] = await db
    .insert(statementsTable)
    .values({
      householdId,
      monthLabel: currentMonthLabel(),
      status: "open",
      total: 0,
      itemCount: 0,
    })
    .returning();
  return created!;
}

export async function fetchStatementItems(statementId: number) {
  return db
    .select({
      id: billItemsTable.id,
      bookingId: billItemsTable.bookingId,
      serviceName: servicesTable.name,
      providerName: providersTable.name,
      memberName: membersTable.name,
      memberId: membersTable.id,
      memberInitials: membersTable.initials,
      categoryName: categoriesTable.name,
      amount: billItemsTable.amount,
      date: billItemsTable.date,
    })
    .from(billItemsTable)
    .innerJoin(bookingsTable, eq(billItemsTable.bookingId, bookingsTable.id))
    .innerJoin(servicesTable, eq(bookingsTable.serviceId, servicesTable.id))
    .innerJoin(providersTable, eq(bookingsTable.providerId, providersTable.id))
    .innerJoin(membersTable, eq(bookingsTable.memberId, membersTable.id))
    .innerJoin(
      categoriesTable,
      eq(providersTable.categoryId, categoriesTable.id),
    )
    .where(eq(billItemsTable.statementId, statementId))
    .orderBy(desc(billItemsTable.date));
}

export async function statementView(statement: {
  id: number;
  monthLabel: string;
  status: string;
  paidAt: Date | null;
  paidWith: string | null;
}) {
  const items = await fetchStatementItems(statement.id);
  const total = items.reduce((sum, item) => sum + item.amount, 0);

  const byMemberMap = new Map<
    number,
    { memberId: number; memberName: string; initials: string; amount: number }
  >();
  const byCategoryMap = new Map<string, number>();
  for (const item of items) {
    const memberEntry = byMemberMap.get(item.memberId) ?? {
      memberId: item.memberId,
      memberName: item.memberName,
      initials: item.memberInitials,
      amount: 0,
    };
    memberEntry.amount += item.amount;
    byMemberMap.set(item.memberId, memberEntry);
    byCategoryMap.set(
      item.categoryName,
      (byCategoryMap.get(item.categoryName) ?? 0) + item.amount,
    );
  }

  return {
    id: statement.id,
    month: statement.monthLabel,
    status: statement.status,
    total,
    paidAt: statement.paidAt,
    paidWith: statement.paidWith,
    items: items.map(({ memberId: _m, memberInitials: _i, ...item }) => item),
    byMember: [...byMemberMap.values()].sort((a, b) => b.amount - a.amount),
    byCategory: [...byCategoryMap.entries()]
      .map(([categoryName, amount]) => ({ categoryName, amount }))
      .sort((a, b) => b.amount - a.amount),
  };
}

export async function addCompletionBillItem(booking: {
  id: number;
  householdId: number;
  priceEstimate: number;
}) {
  const statement = await ensureOpenStatement(booking.householdId);
  await db.insert(billItemsTable).values({
    statementId: statement.id,
    bookingId: booking.id,
    amount: booking.priceEstimate,
    date: new Date(),
  });
  await db
    .update(statementsTable)
    .set({
      total: statement.total + booking.priceEstimate,
      itemCount: statement.itemCount + 1,
    })
    .where(eq(statementsTable.id, statement.id));
}
