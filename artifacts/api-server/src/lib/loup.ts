import { and, asc, count, desc, eq, gt, inArray, isNotNull, ne, sql, sum } from "drizzle-orm";
import {
  db,
  addressesTable,
  allowanceLedgerTable,
  benefitPlansTable,
  billItemsTable,
  bookingsTable,
  categoriesTable,
  employeesTable,
  membersTable,
  packMessagesTable,
  providersTable,
  serviceRequestsTable,
  servicesTable,
  statementsTable,
  webhookEventsTable,
} from "@workspace/db";
import { computePlatformRevenue } from "./money";
import { institutionHasEndpoints, resolveInstitutionId } from "./webhook-delivery";

export const STATUS_CHAIN = [
  "pending",
  "accepted",
  "confirmed",
  "en_route",
  "arrived",
  "in_progress",
  "completed",
] as const;

/** Terminal statuses that cannot advance further */
export const TERMINAL_STATUSES = ["completed", "cancelled", "rejected", "disputed"] as const;

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
  zone: addressesTable.area,
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

/** Structural type satisfied by both a db instance and a drizzle tx callback argument */
type DbOrTx = Pick<typeof db, "select" | "insert" | "update" | "delete">;

export async function ensureOpenStatement(
  householdId: number,
  txOrDb: DbOrTx = db,
) {
  const [open] = await txOrDb
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
  const [created] = await txOrDb
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

/**
 * Write the completion bill item and update the statement running totals.
 *
 * Integrity guarantees:
 *   - Pass `txOrDb` = the active transaction so the status change, bill-item
 *     insert, and total update are committed atomically. If any step fails the
 *     entire transaction rolls back, leaving the booking in its previous
 *     non-terminal state so a retry can start cleanly.
 *   - The INSERT uses the unique index on bill_items.booking_id
 *     (ON CONFLICT DO NOTHING) as an extra safety net against accidental
 *     double-calls within the same transaction.
 *   - The total/itemCount update uses a subquery that re-aggregates from the
 *     actual items, making it idempotent regardless of call order or retries:
 *     running it twice produces the same result as running it once.
 */
export async function addCompletionBillItem(
  booking: { id: number; householdId: number; priceEstimate: number },
  txOrDb: DbOrTx = db,
) {
  const statement = await ensureOpenStatement(booking.householdId, txOrDb);

  // Idempotent insert — the unique index on booking_id prevents a second row.
  await txOrDb
    .insert(billItemsTable)
    .values({
      statementId: statement.id,
      bookingId: booking.id,
      amount: booking.priceEstimate,
      date: new Date(),
    })
    .onConflictDoNothing();

  // Always recompute the denormalised totals from the live item rows.
  // This is a subquery update, so it is idempotent: running it a second time
  // after a partial-failure retry produces the exact same values — unlike the
  // earlier `total + price` increment, which would double-count.
  await txOrDb
    .update(statementsTable)
    .set({
      total: sql`(SELECT COALESCE(SUM(amount), 0) FROM bill_items WHERE statement_id = ${statement.id})`,
      itemCount: sql`(SELECT COUNT(*) FROM bill_items WHERE statement_id = ${statement.id})`,
    })
    .where(eq(statementsTable.id, statement.id));
}

/**
 * Record a platform event for the admin webhook log (P0-3).
 *
 * Demo mode simulates delivery: events land as `delivered` with a timestamp
 * by default; callers may force `failed` (deliveredAt stays null) to exercise
 * the retry story in the admin UI. Production would hand these to the outbox
 * delivery worker (P1-3) instead.
 */
export async function writeWebhookEvent(
  eventType: string,
  payload: Record<string, unknown>,
  opts: { status?: "pending" | "delivered" | "failed" } = {},
): Promise<void> {
  // P1-3: if the event's institution has a real webhook endpoint, enqueue the
  // event for signed delivery by the outbox worker instead of simulating it.
  const institutionId = await resolveInstitutionId(payload);
  if (institutionId != null && (await institutionHasEndpoints(institutionId))) {
    await db.insert(webhookEventsTable).values({
      eventType,
      payload,
      status: "pending",
      nextAttemptAt: new Date(),
    });
    return;
  }

  const status = opts.status ?? "delivered";
  await db.insert(webhookEventsTable).values({
    eventType,
    payload,
    status,
    deliveredAt: status === "delivered" ? new Date() : null,
  });
}

/**
 * Loup platform fee estimate (P0-4, Decision D2 hybrid).
 *
 * Revenue per institution = feeRate% of (redeemed + reserved) this cycle
 *                           + perEmployeeMonthlyFee × eligible employees.
 * Pass an institutionId to scope to a single tenant (employer overview);
 * omit it for the platform-wide ops console number.
 */
/** Active benefit plans' fee config, one row per institution (assumes one active plan per institution). */
async function activeBenefitPlans() {
  return db
    .select({
      id: benefitPlansTable.id,
      institutionId: benefitPlansTable.institutionId,
      feeRatePct: benefitPlansTable.platformFeeRatePct,
      perEmployeeMonthlyFee: benefitPlansTable.perEmployeeMonthlyFee,
    })
    .from(benefitPlansTable)
    .where(eq(benefitPlansTable.active, true));
}

/**
 * institutionId → platform fee rate %, for every institution with an active
 * benefit plan (P1-5, shared by the platform-revenue estimate and provider
 * settlement math so both use the exact same fee configuration).
 */
export async function feeRateByInstitution(): Promise<Map<number, number>> {
  const plans = await activeBenefitPlans();
  return new Map(plans.map((p) => [p.institutionId, p.feeRatePct]));
}

/** memberId → institutionId, for every employee whose household is linked (P1-5). */
export async function institutionIdByMember(): Promise<Map<number, number>> {
  const rows = await db
    .select({ memberId: employeesTable.linkedMemberId, institutionId: employeesTable.institutionId })
    .from(employeesTable)
    .where(isNotNull(employeesTable.linkedMemberId));
  return new Map(rows.filter((r): r is { memberId: number; institutionId: number } => r.memberId != null).map((r) => [r.memberId, r.institutionId]));
}

export async function estimateMonthlyPlatformRevenue(institutionId?: number | null): Promise<{
  total: number;
  byInstitution: { institutionId: number; feeRatePct: number; perEmployeeMonthlyFee: number; employees: number; cycleVolume: number; monthly: number }[];
}> {
  const plans = await activeBenefitPlans();

  const [ledgerByInstitution, empCountByInstitution] = await Promise.all([
    db
      .select({
        institutionId: employeesTable.institutionId,
        total: sum(allowanceLedgerTable.amount),
      })
      .from(allowanceLedgerTable)
      .innerJoin(employeesTable, eq(allowanceLedgerTable.employeeId, employeesTable.id))
      .where(inArray(allowanceLedgerTable.entryType, ["redeemed", "reserved"]))
      .groupBy(employeesTable.institutionId),
    db
      .select({ institutionId: employeesTable.institutionId, count: count() })
      .from(employeesTable)
      .where(and(eq(employeesTable.eligibilityStatus, "eligible"), isNotNull(employeesTable.tierId)))
      .groupBy(employeesTable.institutionId),
  ]);

  const volumeByInstitution = new Map(ledgerByInstitution.map((r) => [r.institutionId, Number(r.total ?? 0)]));
  const employeesByInstitution = new Map(empCountByInstitution.map((r) => [r.institutionId, r.count]));

  const rows = plans
    .filter((p) => institutionId == null || p.institutionId === institutionId)
    .map((p) => ({
      institutionId: p.institutionId,
      feeRatePct: p.feeRatePct,
      perEmployeeMonthlyFee: p.perEmployeeMonthlyFee,
      cycleVolume: volumeByInstitution.get(p.institutionId) ?? 0,
      eligibleEmployees: employeesByInstitution.get(p.institutionId) ?? 0,
    }));

  const computed = computePlatformRevenue(rows);
  const byInstitution = computed.byInstitution.map((c) => {
    const row = rows.find((r) => r.institutionId === c.institutionId)!;
    return {
      ...c,
      employees: row.eligibleEmployees,
      cycleVolume: Math.round(row.cycleVolume * 100) / 100,
    };
  });

  return { total: computed.total, byInstitution };
}
