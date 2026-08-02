import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, householdsTable, membersTable, statementsTable } from "@workspace/db";
import { GetHomeSummaryResponse } from "@workspace/api-zod";
import {
  countUnreadPackMessages,
  fetchBookingViews,
  fetchPackMessages,
  fetchServiceRequests,
  getCurrentMember,
} from "../lib/loup";
import { currentMonthSpendByMember } from "../lib/spend";

const router: IRouter = Router();

router.get("/home/summary", async (_req, res): Promise<void> => {
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
    .where(eq(membersTable.householdId, member.householdId));

  const live = await fetchBookingViews({
    statuses: ["en_route", "arrived", "in_progress"],
  });
  const now = Date.now();
  const upcoming = (
    await fetchBookingViews({ statuses: ["pending", "confirmed"] })
  ).filter((b) => b.scheduledAt.getTime() >= now - 60 * 60 * 1000);

  const [openStatement] = await db
    .select()
    .from(statementsTable)
    .where(eq(statementsTable.status, "open"));

  const spendByMember = await currentMonthSpendByMember();
  let monthToDateSpend = 0;
  for (const amount of spendByMember.values()) {
    monthToDateSpend += amount;
  }

  const packMessages = await fetchPackMessages(member.householdId);
  const packUnreadCount = await countUnreadPackMessages(member);
  const requests = await fetchServiceRequests(member.householdId);
  const pendingRequests = requests.filter((r) => r.status === "pending");

  const data = GetHomeSummaryResponse.parse({
    memberName: member.name,
    householdName: home?.name ?? "Household",
    activeBooking: live[0] ?? null,
    nextBooking: upcoming[0] ?? null,
    upcomingCount: upcoming.length,
    openBillTotal: openStatement?.total ?? 0,
    monthToDateSpend,
    memberCount: members.length,
    isHeadOfHousehold: member.role === "head",
    packUnreadCount,
    recentPackMessages: packMessages.slice(-3).reverse(),
    pendingRequests,
  });
  res.json(data);
});

export default router;
