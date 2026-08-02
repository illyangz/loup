import { Router, type IRouter } from "express";
import { desc, eq, isNotNull } from "drizzle-orm";
import {
  db,
  addressesTable,
  bookingEventsTable,
  householdsTable,
  membersTable,
  providersTable,
  reviewsTable,
  statementsTable,
} from "@workspace/db";
import {
  GetHouseholdResponse,
  ListAddressesResponse,
  ListHouseholdActivityResponse,
} from "@workspace/api-zod";
import { fetchBookingViews, getCurrentMember } from "../lib/loup";
import { currentMonthSpendByMember } from "../lib/spend";

const router: IRouter = Router();

router.get("/household", async (_req, res): Promise<void> => {
  const member = await getCurrentMember();
  if (!member) {
    res.status(500).json({ error: "No household data seeded" });
    return;
  }
  const [home] = await db
    .select()
    .from(householdsTable)
    .where(eq(householdsTable.id, member.householdId));
  const members = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.householdId, member.householdId))
    .orderBy(membersTable.id);
  const spendByMember = await currentMonthSpendByMember();

  const data = GetHouseholdResponse.parse({
    id: member.householdId,
    name: home?.name ?? "Household",
    members: members.map((m) => ({
      id: m.id,
      name: m.name,
      relation: m.relation,
      role: m.role,
      initials: m.initials,
      monthlySpendLimit: m.monthlySpendLimit,
      monthToDateSpend: spendByMember.get(m.id) ?? 0,
      isCurrentUser: m.isCurrentUser,
    })),
  });
  res.json(data);
});

router.get("/household/activity", async (_req, res): Promise<void> => {
  const member = await getCurrentMember();
  const bookings = await fetchBookingViews({ order: "desc" });
  const bookingById = new Map(bookings.map((b) => [b.id, b]));

  type Item = {
    kind: string;
    memberName: string;
    description: string;
    amount: number | null;
    occurredAt: Date;
  };
  const items: Item[] = [];

  for (const b of bookings.slice().sort((x, y) => y.createdAt.getTime() - x.createdAt.getTime()).slice(0, 12)) {
    items.push({
      kind: "booking_created",
      memberName: b.memberName,
      description: `Booked ${b.serviceName} with ${b.providerName}`,
      amount: null,
      occurredAt: b.createdAt,
    });
  }

  const completedEvents = await db
    .select()
    .from(bookingEventsTable)
    .where(eq(bookingEventsTable.status, "completed"))
    .orderBy(desc(bookingEventsTable.occurredAt))
    .limit(12);
  for (const event of completedEvents) {
    const b = bookingById.get(event.bookingId);
    if (!b) continue;
    items.push({
      kind: "booking_completed",
      memberName: b.memberName,
      description: `${b.serviceName} completed by ${b.providerName}`,
      amount: b.priceEstimate,
      occurredAt: event.occurredAt,
    });
  }

  const paidStatements = await db
    .select()
    .from(statementsTable)
    .where(eq(statementsTable.status, "paid"))
    .orderBy(desc(statementsTable.paidAt))
    .limit(6);
  for (const statement of paidStatements) {
    if (!statement.paidAt) continue;
    items.push({
      kind: "payment",
      memberName: member?.name ?? "Household",
      description: `Settled the ${statement.monthLabel} household bill${statement.paidWith ? ` with ${statement.paidWith}` : ""}`,
      amount: statement.total,
      occurredAt: statement.paidAt,
    });
  }

  const householdReviews = await db
    .select({
      rating: reviewsTable.rating,
      authorName: reviewsTable.authorName,
      createdAt: reviewsTable.createdAt,
      providerName: providersTable.name,
    })
    .from(reviewsTable)
    .innerJoin(providersTable, eq(reviewsTable.providerId, providersTable.id))
    .where(isNotNull(reviewsTable.bookingId))
    .orderBy(desc(reviewsTable.createdAt))
    .limit(6);
  for (const review of householdReviews) {
    items.push({
      kind: "review",
      memberName: review.authorName,
      description: `Rated ${review.providerName} ${review.rating}/5`,
      amount: null,
      occurredAt: review.createdAt,
    });
  }

  items.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime());
  const data = ListHouseholdActivityResponse.parse(
    items.slice(0, 20).map((item, index) => ({ id: index + 1, ...item })),
  );
  res.json(data);
});

router.get("/addresses", async (_req, res): Promise<void> => {
  const rows = await db.select().from(addressesTable).orderBy(addressesTable.id);
  res.json(ListAddressesResponse.parse(rows));
});

export default router;
