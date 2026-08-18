import { and, asc, desc, eq, gt, inArray, ne } from "drizzle-orm";
import {
  db,
  addressesTable,
  billItemsTable,
  bookingsTable,
  categoriesTable,
  membersTable,
  packMessagesTable,
  providersTable,
  serviceRequestsTable,
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

// The platform exposes three customer-facing categories. Legacy catalog rows
// for AC Cooling and Handyman are grouped into Home Maintenance.
export const BOOKABLE_CATEGORY_SLUGS = [
  "household-admin",
  "personal-wellbeing",
  "fitness-recovery",
  "mobility-convenience",
  "family-support",
  "personal-development",
  "recreation-lifestyle",
] as const;

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
  const conditions = [inArray(categoriesTable.slug, BOOKABLE_CATEGORY_SLUGS)];
  if (opts?.statuses && opts.statuses.length > 0) {
    conditions.push(inArray(bookingsTable.status, opts.statuses));
  }
  query = query.where(and(...conditions));
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
  const rows = await bookingQuery().where(
    and(
      eq(bookingsTable.id, id),
      inArray(categoriesTable.slug, BOOKABLE_CATEGORY_SLUGS),
    ),
  );
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
    .where(
      and(
        eq(billItemsTable.statementId, statementId),
        inArray(categoriesTable.slug, BOOKABLE_CATEGORY_SLUGS),
      ),
    )
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

export async function fetchPackMessages(householdId: number) {
  return db
    .select({
      id: packMessagesTable.id,
      memberId: packMessagesTable.memberId,
      memberName: membersTable.name,
      initials: membersTable.initials,
      isCurrentUser: membersTable.isCurrentUser,
      body: packMessagesTable.body,
      sentAt: packMessagesTable.sentAt,
    })
    .from(packMessagesTable)
    .innerJoin(membersTable, eq(packMessagesTable.memberId, membersTable.id))
    .where(eq(packMessagesTable.householdId, householdId))
    .orderBy(asc(packMessagesTable.sentAt));
}

export async function countUnreadPackMessages(member: {
  id: number;
  householdId: number;
  packLastReadAt: Date | null;
}): Promise<number> {
  const conditions = [
    eq(packMessagesTable.householdId, member.householdId),
    ne(packMessagesTable.memberId, member.id),
  ];
  if (member.packLastReadAt) {
    conditions.push(gt(packMessagesTable.sentAt, member.packLastReadAt));
  }
  const rows = await db
    .select({ id: packMessagesTable.id })
    .from(packMessagesTable)
    .where(and(...conditions));
  return rows.length;
}

export async function fetchServiceRequests(householdId: number) {
  return db
    .select({
      id: serviceRequestsTable.id,
      memberId: serviceRequestsTable.memberId,
      memberName: membersTable.name,
      initials: membersTable.initials,
      serviceId: serviceRequestsTable.serviceId,
      serviceName: servicesTable.name,
      providerName: providersTable.name,
      categoryName: categoriesTable.name,
      categoryIcon: categoriesTable.icon,
      price: servicesTable.price,
      note: serviceRequestsTable.note,
      status: serviceRequestsTable.status,
      bookingId: serviceRequestsTable.bookingId,
      createdAt: serviceRequestsTable.createdAt,
      decidedAt: serviceRequestsTable.decidedAt,
    })
    .from(serviceRequestsTable)
    .innerJoin(membersTable, eq(serviceRequestsTable.memberId, membersTable.id))
    .innerJoin(servicesTable, eq(serviceRequestsTable.serviceId, servicesTable.id))
    .innerJoin(providersTable, eq(servicesTable.providerId, providersTable.id))
    .innerJoin(categoriesTable, eq(providersTable.categoryId, categoriesTable.id))
    .where(
      and(
        eq(serviceRequestsTable.householdId, householdId),
        inArray(categoriesTable.slug, BOOKABLE_CATEGORY_SLUGS),
      ),
    )
    .orderBy(desc(serviceRequestsTable.createdAt));
}

export async function postPackMessage(
  householdId: number,
  memberId: number,
  body: string,
) {
  const [message] = await db
    .insert(packMessagesTable)
    .values({ householdId, memberId, body, sentAt: new Date() })
    .returning();
  return message!;
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
