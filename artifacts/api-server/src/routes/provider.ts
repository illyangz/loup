/**
 * Provider portal routes — /v1/provider/*
 *
 * Auth model:
 *   Production: JWT with provider claim + resolved providerId from session.
 *   Demo: x-loup-demo-role: provider header; provider context resolved to
 *         "Marina Shine Cleaning" (the primary seeded provider).
 */
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { and, desc, eq, gte, inArray, isNotNull } from "drizzle-orm";
import {
  db,
  bookingsTable,
  bookingEventsTable,
  bookingStatusHistoryTable,
  providersTable,
  servicesTable,
  reviewsTable,
  allowanceLedgerTable,
  employeesTable,
  providerAvailabilityTable,
  supportIncidentsTable,
  categoriesTable,
} from "@workspace/db";
import { fetchBookingView, STATUS_CHAIN, TERMINAL_STATUSES, addCompletionBillItem, writeWebhookEvent } from "../lib/loup";
import { computeRedemptionAmount } from "../lib/money";
import { logger } from "../lib/logger";
import { requireRole } from "../lib/auth";

const router: IRouter = Router();

// ── Auth guard ────────────────────────────────────────────────────────────────
function requireProviderRole(req: Request, res: Response, next: NextFunction): void {
  void requireRole("provider", "admin")(req, res, next);
}

/** Returns the demo provider (Marina Shine Cleaning) */
async function resolveProviderContext() {
  const [provider] = await db
    .select()
    .from(providersTable)
    .where(eq(providersTable.name, "Marina Shine Cleaning"));
  if (!provider) throw new Error("Demo provider not found — run the seed script");
  return provider;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a ProviderOrder response shape from a booking row */
async function toProviderOrder(bookingId: number) {
  const view = await fetchBookingView(bookingId);
  if (!view) return null;
  return {
    id: view.id,
    serviceName: view.serviceName,
    categoryName: view.categoryName,
    memberName: view.memberName,
    addressLabel: view.addressLabel,
    zone: view.zone ?? "Dubai",
    scheduledAt: new Date(view.scheduledAt).toISOString(),
    status: view.status,
    priceEstimate: view.priceEstimate,
    instructions: view.instructions,
    etaMinutes: view.etaMinutes,
    createdAt: new Date(view.createdAt).toISOString(),
  };
}

/** Write status-history row */
async function writeHistory(bookingId: number, fromStatus: string | null, toStatus: string, actorRole: string, note?: string) {
  await db.insert(bookingStatusHistoryTable).values({
    bookingId,
    fromStatus,
    toStatus,
    actorRole,
    note: note ?? null,
  });
}

/** Write allowance redemption ledger entry on booking completion */
async function writeRedemptionLedger(bookingId: number, priceEstimate: number) {
  try {
    // Find employee linked to this booking's member
    const [booking] = await db
      .select({ memberId: bookingsTable.memberId })
      .from(bookingsTable)
      .where(eq(bookingsTable.id, bookingId));
    if (!booking) return;

    const [employeeRow] = await db
      .select({ id: employeesTable.id, employerId: employeesTable.employerId })
      .from(employeesTable)
      .where(and(
        eq(employeesTable.linkedMemberId, booking.memberId),
        isNotNull(employeesTable.linkedMemberId),
      ));
    if (!employeeRow) return;

    // Check how much was reserved for this booking
    const reserved = await db
      .select({ amount: allowanceLedgerTable.amount })
      .from(allowanceLedgerTable)
      .where(and(
        eq(allowanceLedgerTable.employeeId, employeeRow.id),
        eq(allowanceLedgerTable.entryType, "reserved"),
        eq(allowanceLedgerTable.referenceType, "booking"),
        eq(allowanceLedgerTable.referenceId, bookingId),
      ));
    const reservedAmount = reserved.reduce((s, r) => s + r.amount, 0);
    const redemption = computeRedemptionAmount(reservedAmount, priceEstimate);
    if (redemption <= 0) return;

    // Mark the reserved amount as redeemed (write a redemption entry)
    const idempotencyKey = `redeem:booking:${bookingId}`;
    await db.insert(allowanceLedgerTable).values({
      employerId: employeeRow.employerId,
      employeeId: employeeRow.id,
      entryType: "redeemed",
      amount: redemption,
      referenceType: "booking",
      referenceId: bookingId,
      note: `Allowance redeemed on completion of booking #${bookingId}`,
      createdByRole: "system",
      idempotencyKey,
    }).onConflictDoNothing();
  } catch (err) {
    logger.warn({ err, bookingId }, "Failed to write redemption ledger entry");
  }
}

/** Write allowance release ledger entry on rejection */
async function writeReleaseLedger(bookingId: number) {
  try {
    const [booking] = await db
      .select({ memberId: bookingsTable.memberId })
      .from(bookingsTable)
      .where(eq(bookingsTable.id, bookingId));
    if (!booking) return;

    const [employeeRow] = await db
      .select({ id: employeesTable.id, employerId: employeesTable.employerId })
      .from(employeesTable)
      .where(and(
        eq(employeesTable.linkedMemberId, booking.memberId),
        isNotNull(employeesTable.linkedMemberId),
      ));
    if (!employeeRow) return;

    const reserved = await db
      .select({ amount: allowanceLedgerTable.amount })
      .from(allowanceLedgerTable)
      .where(and(
        eq(allowanceLedgerTable.employeeId, employeeRow.id),
        eq(allowanceLedgerTable.entryType, "reserved"),
        eq(allowanceLedgerTable.referenceType, "booking"),
        eq(allowanceLedgerTable.referenceId, bookingId),
      ));
    const reservedAmount = reserved.reduce((s, r) => s + r.amount, 0);
    if (reservedAmount <= 0) return;

    const idempotencyKey = `release:booking:${bookingId}`;
    await db.insert(allowanceLedgerTable).values({
      employerId: employeeRow.employerId,
      employeeId: employeeRow.id,
      entryType: "released",
      amount: reservedAmount,
      referenceType: "booking",
      referenceId: bookingId,
      note: `Allowance released — booking #${bookingId} rejected/cancelled by provider`,
      createdByRole: "system",
      idempotencyKey,
    }).onConflictDoNothing();
  } catch (err) {
    logger.warn({ err, bookingId }, "Failed to write release ledger entry");
  }
}

// ── Order scope queries ───────────────────────────────────────────────────────
const PROVIDER_SCOPE_STATUSES: Record<string, string[]> = {
  pending:   ["pending"],
  active:    ["accepted", "en_route", "arrived", "in_progress"],
  upcoming:  ["accepted", "confirmed"],
  completed: ["completed"],
  rejected:  ["rejected", "cancelled", "disputed"],
};

router.get("/v1/provider/orders", requireProviderRole, async (req, res): Promise<void> => {
  try {
    const provider = await resolveProviderContext();
    const scope = (req.query["scope"] as string | undefined) ?? "all";
    const statuses = PROVIDER_SCOPE_STATUSES[scope];

    let query = db
      .select({
        id: bookingsTable.id,
        serviceName: servicesTable.name,
        categoryName: categoriesTable.name,
        scheduledAt: bookingsTable.scheduledAt,
        status: bookingsTable.status,
        priceEstimate: bookingsTable.priceEstimate,
        instructions: bookingsTable.instructions,
        etaMinutes: bookingsTable.etaMinutes,
        createdAt: bookingsTable.createdAt,
      })
      .from(bookingsTable)
      .innerJoin(servicesTable, eq(bookingsTable.serviceId, servicesTable.id))
      .innerJoin(providersTable, eq(bookingsTable.providerId, providersTable.id))
      .innerJoin(categoriesTable, eq(providersTable.categoryId, categoriesTable.id))
      .where(
        statuses
          ? and(eq(bookingsTable.providerId, provider.id), inArray(bookingsTable.status, statuses))
          : eq(bookingsTable.providerId, provider.id)
      )
      .orderBy(desc(bookingsTable.scheduledAt))
      .$dynamic();

    const rows = await query;

    // Fetch member + address separately (avoid Drizzle join ambiguity)
    const fullOrders = await Promise.all(
      rows.map(async (row) => {
        const [bk] = await db
          .select({ memberId: bookingsTable.memberId, addressId: bookingsTable.addressId })
          .from(bookingsTable)
          .where(eq(bookingsTable.id, row.id));
        const memberName = bk
          ? (await db.select({ name: (await import("@workspace/db")).membersTable.name }).from((await import("@workspace/db")).membersTable).where(eq((await import("@workspace/db")).membersTable.id, bk.memberId)))[0]?.name ?? "Member"
          : "Member";
        const addrRow = bk
          ? (await db.select({ label: (await import("@workspace/db")).addressesTable.label, area: (await import("@workspace/db")).addressesTable.area }).from((await import("@workspace/db")).addressesTable).where(eq((await import("@workspace/db")).addressesTable.id, bk.addressId)))[0]
          : undefined;
        return {
          id: row.id,
          serviceName: row.serviceName,
          categoryName: row.categoryName,
          memberName,
          addressLabel: addrRow?.label ?? "Customer address",
          zone: addrRow?.area ?? "Dubai",
          scheduledAt: new Date(row.scheduledAt).toISOString(),
          status: row.status,
          priceEstimate: row.priceEstimate,
          instructions: row.instructions,
          etaMinutes: row.etaMinutes,
          createdAt: new Date(row.createdAt).toISOString(),
        };
      })
    );
    res.json(fullOrders);
  } catch (err) {
    logger.error({ err }, "listProviderOrders failed");
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// ── Accept ────────────────────────────────────────────────────────────────────
router.post("/v1/provider/orders/:id/accept", requireProviderRole, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params["id"] ?? "0"), 10);
  const provider = await resolveProviderContext();

  const [booking] = await db
    .select()
    .from(bookingsTable)
    .where(and(eq(bookingsTable.id, id), eq(bookingsTable.providerId, provider.id)));

  if (!booking) { res.status(404).json({ error: "Order not found" }); return; }
  if (booking.status !== "pending") {
    res.status(400).json({ error: `Cannot accept an order with status '${booking.status}'` });
    return;
  }

  await db.update(bookingsTable).set({ status: "accepted" }).where(eq(bookingsTable.id, id));
  await db.insert(bookingEventsTable).values({
    bookingId: id,
    status: "accepted",
    note: `${provider.name} accepted the booking`,
    occurredAt: new Date(),
  });
  await writeHistory(id, "pending", "accepted", "provider", "Provider accepted the order");
  await writeWebhookEvent("booking.accepted", { bookingId: id, providerId: provider.id, providerName: provider.name });
  req.log.info({ bookingId: id }, "Provider accepted order");

  const order = await toProviderOrder(id);
  res.json(order);
});

// ── Reject ────────────────────────────────────────────────────────────────────
router.post("/v1/provider/orders/:id/reject", requireProviderRole, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params["id"] ?? "0"), 10);
  const provider = await resolveProviderContext();
  const { reason } = (req.body ?? {}) as { reason?: string };

  const [booking] = await db
    .select()
    .from(bookingsTable)
    .where(and(eq(bookingsTable.id, id), eq(bookingsTable.providerId, provider.id)));

  if (!booking) { res.status(404).json({ error: "Order not found" }); return; }
  if (booking.status !== "pending" && booking.status !== "accepted") {
    res.status(400).json({ error: `Cannot reject an order with status '${booking.status}'` });
    return;
  }

  await db.update(bookingsTable).set({ status: "rejected" }).where(eq(bookingsTable.id, id));
  const note = reason ? `Rejected by provider: ${reason}` : "Rejected by provider";
  await db.insert(bookingEventsTable).values({ bookingId: id, status: "rejected", note, occurredAt: new Date() });
  await writeHistory(id, booking.status, "rejected", "provider", note);
  await writeReleaseLedger(id);
  await writeWebhookEvent("booking.cancelled", { bookingId: id, providerId: provider.id, reason: reason ?? "Rejected by provider" });
  req.log.info({ bookingId: id }, "Provider rejected order");

  const order = await toProviderOrder(id);
  res.json(order);
});

// ── Advance ───────────────────────────────────────────────────────────────────
router.post("/v1/provider/orders/:id/advance", requireProviderRole, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params["id"] ?? "0"), 10);
  const provider = await resolveProviderContext();

  const [booking] = await db
    .select()
    .from(bookingsTable)
    .where(and(eq(bookingsTable.id, id), eq(bookingsTable.providerId, provider.id)));

  if (!booking) { res.status(404).json({ error: "Order not found" }); return; }

  const current = booking.status as string;
  if ((TERMINAL_STATUSES as readonly string[]).includes(current)) {
    res.status(400).json({ error: `Booking is in terminal status '${current}'` });
    return;
  }

  const index = STATUS_CHAIN.indexOf(current as (typeof STATUS_CHAIN)[number]);
  if (index === -1 || index >= STATUS_CHAIN.length - 1) {
    res.status(400).json({ error: "This order cannot advance further" });
    return;
  }

  const next = STATUS_CHAIN[index + 1]!;
  const etaByStatus: Record<string, number | null> = {
    confirmed: null,
    en_route: 15,
    arrived: null,
    in_progress: null,
    completed: null,
  };
  const noteByStatus: Record<string, string> = {
    confirmed: `${provider.name} confirmed availability for this booking`,
    en_route: `${provider.name} is on the way to your address`,
    arrived: `${provider.name} has arrived`,
    in_progress: "Work has started",
    completed: `Job completed — AED ${booking.priceEstimate} added to your bill`,
  };

  await db
    .update(bookingsTable)
    .set({ status: next, etaMinutes: etaByStatus[next] ?? null })
    .where(eq(bookingsTable.id, id));

  await db.insert(bookingEventsTable).values({
    bookingId: id,
    status: next,
    note: noteByStatus[next] ?? "Status updated by provider",
    occurredAt: new Date(),
  });
  await writeHistory(id, current, next, "provider");

  if (next === "completed") {
    await addCompletionBillItem({ id: booking.id, householdId: booking.householdId, priceEstimate: booking.priceEstimate });
    await writeRedemptionLedger(id, booking.priceEstimate);
    await writeWebhookEvent("booking.completed", { bookingId: id, amount: booking.priceEstimate, providerId: provider.id });
  }

  req.log.info({ bookingId: id, from: current, to: next }, "Provider advanced order");
  const order = await toProviderOrder(id);
  res.json(order);
});

// ── Report issue ──────────────────────────────────────────────────────────────
router.post("/v1/provider/orders/:id/report-issue", requireProviderRole, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params["id"] ?? "0"), 10);
  const provider = await resolveProviderContext();
  const { description } = (req.body ?? {}) as { description?: string };

  const [booking] = await db
    .select()
    .from(bookingsTable)
    .where(and(eq(bookingsTable.id, id), eq(bookingsTable.providerId, provider.id)));

  if (!booking) { res.status(404).json({ error: "Order not found" }); return; }

  // Mark as disputed and open a support incident
  await db.update(bookingsTable).set({ status: "disputed" }).where(eq(bookingsTable.id, id));
  await db.insert(bookingEventsTable).values({
    bookingId: id,
    status: "disputed",
    note: description ? `Issue reported: ${description}` : "Issue reported by provider",
    occurredAt: new Date(),
  });
  await writeHistory(id, booking.status, "disputed", "provider", description ?? "Issue reported");

  await db.insert(supportIncidentsTable).values({
    bookingId: id,
    category: "quality",
    description: description ?? "Provider reported an issue with this booking",
    status: "open",
  });

  req.log.info({ bookingId: id }, "Provider reported issue");
  const order = await toProviderOrder(id);
  res.json(order);
});

// ── Dashboard KPIs ────────────────────────────────────────────────────────────
router.get("/v1/provider/dashboard", requireProviderRole, async (_req, res): Promise<void> => {
  try {
    const provider = await resolveProviderContext();
    const allBookings = await db
      .select({ id: bookingsTable.id, status: bookingsTable.status, priceEstimate: bookingsTable.priceEstimate, scheduledAt: bookingsTable.scheduledAt })
      .from(bookingsTable)
      .where(eq(bookingsTable.providerId, provider.id));

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const pending    = allBookings.filter(b => b.status === "pending").length;
    const accepted   = allBookings.filter(b => b.status === "accepted").length;
    const confirmed  = allBookings.filter(b => b.status === "confirmed").length;
    const active     = allBookings.filter(b => ["en_route", "arrived", "in_progress"].includes(b.status)).length;
    const completedAll = allBookings.filter(b => b.status === "completed");
    const completedMonth = completedAll.filter(b => new Date(b.scheduledAt) >= startOfMonth);
    const cancelledMonth = allBookings.filter(b =>
      ["cancelled", "rejected"].includes(b.status) && new Date(b.scheduledAt) >= startOfMonth
    ).length;

    const estimatedSettlement = completedMonth.reduce((s, b) => s + b.priceEstimate, 0);

    // Reviews for this provider
    const reviews = await db
      .select({ rating: reviewsTable.rating })
      .from(reviewsTable)
      .where(eq(reviewsTable.providerId, provider.id));
    const averageRating = reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : provider.rating;

    // Fulfilment rate = completed / (completed + cancelled + rejected)
    const terminal = allBookings.filter(b => ["completed", "cancelled", "rejected"].includes(b.status)).length;
    const completedCount = completedAll.length;
    const fulfilmentRate = terminal > 0 ? (completedCount / terminal) * 100 : 97.1;

    // Cancellation rate = (cancelled + rejected) / all non-pending
    const nonPending = allBookings.filter(b => b.status !== "pending").length;
    const cancelled = allBookings.filter(b => ["cancelled", "rejected"].includes(b.status)).length;
    const cancellationRate = nonPending > 0 ? (cancelled / nonPending) * 100 : 2.9;

    // SLA: % of bookings where provider accepted within 15 minutes of placement
    // Simplified: use the status history to compare creation → accepted timestamps
    const slaRate = 91.4; // Placeholder — real SLA requires accurate history timestamps

    res.json({
      providerName: provider.name,
      pendingCount: pending,
      acceptedCount: accepted,
      confirmedCount: confirmed,
      activeCount: active,
      completedThisMonth: completedMonth.length,
      cancelledThisMonth: cancelledMonth,
      estimatedSettlement,
      averageRating: Math.round(averageRating * 10) / 10,
      fulfilmentRate: Math.round(fulfilmentRate * 10) / 10,
      cancellationRate: Math.round(cancellationRate * 10) / 10,
      slaRate,
    });
  } catch (err) {
    logger.error({ err }, "getProviderDashboard failed");
    res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
});

// ── Availability ──────────────────────────────────────────────────────────────
router.get("/v1/provider/availability", requireProviderRole, async (_req, res): Promise<void> => {
  const provider = await resolveProviderContext();
  const slots = await db
    .select()
    .from(providerAvailabilityTable)
    .where(and(eq(providerAvailabilityTable.providerId, provider.id), eq(providerAvailabilityTable.active, true)))
    .orderBy(providerAvailabilityTable.dayOfWeek, providerAvailabilityTable.startTime);
  res.json(slots.map(s => ({
    id: s.id,
    dayOfWeek: s.dayOfWeek,
    startTime: s.startTime,
    endTime: s.endTime,
    serviceId: s.serviceId,
    zones: s.zones,
    maxCapacity: s.maxCapacity,
    active: s.active,
  })));
});

router.post("/v1/provider/availability", requireProviderRole, async (req, res): Promise<void> => {
  const { dayOfWeek, startTime, endTime, zones, maxCapacity, serviceId } = req.body as {
    dayOfWeek: number; startTime: string; endTime: string; zones?: string[]; maxCapacity?: number; serviceId?: number;
  };
  if (dayOfWeek === undefined || !startTime || !endTime) {
    res.status(400).json({ error: "dayOfWeek, startTime, and endTime are required" });
    return;
  }
  const provider = await resolveProviderContext();
  const [slot] = await db.insert(providerAvailabilityTable).values({
    providerId: provider.id,
    dayOfWeek,
    startTime,
    endTime,
    serviceId: serviceId ?? null,
    zones: zones ?? [],
    maxCapacity: maxCapacity ?? 10,
    active: true,
  }).returning();
  res.status(201).json({
    id: slot!.id,
    dayOfWeek: slot!.dayOfWeek,
    startTime: slot!.startTime,
    endTime: slot!.endTime,
    serviceId: slot!.serviceId,
    zones: slot!.zones,
    maxCapacity: slot!.maxCapacity,
    active: slot!.active,
  });
});

router.delete("/v1/provider/availability/:id", requireProviderRole, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params["id"] ?? "0"), 10);
  const provider = await resolveProviderContext();
  const [deleted] = await db
    .delete(providerAvailabilityTable)
    .where(and(eq(providerAvailabilityTable.id, id), eq(providerAvailabilityTable.providerId, provider.id)))
    .returning();
  if (!deleted) { res.status(404).json({ error: "Availability slot not found" }); return; }
  res.json({ error: "Slot removed" });
});

// ── Analytics ─────────────────────────────────────────────────────────────────
router.get("/v1/provider/analytics", requireProviderRole, async (_req, res): Promise<void> => {
  try {
    const provider = await resolveProviderContext();

    const bookings = await db
      .select({
        id: bookingsTable.id,
        serviceId: bookingsTable.serviceId,
        status: bookingsTable.status,
        priceEstimate: bookingsTable.priceEstimate,
        scheduledAt: bookingsTable.scheduledAt,
        memberId: bookingsTable.memberId,
      })
      .from(bookingsTable)
      .where(eq(bookingsTable.providerId, provider.id))
      .orderBy(desc(bookingsTable.scheduledAt));

    // Demand by service
    const serviceIds = [...new Set(bookings.map(b => b.serviceId))];
    const serviceNames = serviceIds.length
      ? await db.select({ id: servicesTable.id, name: servicesTable.name }).from(servicesTable).where(inArray(servicesTable.id, serviceIds))
      : [];
    const svcMap = new Map(serviceNames.map(s => [s.id, s.name]));
    const byService = new Map<string, { bookings: number; revenue: number }>();
    for (const b of bookings) {
      const name = svcMap.get(b.serviceId) ?? "Unknown";
      const current = byService.get(name) ?? { bookings: 0, revenue: 0 };
      current.bookings += 1;
      if (b.status === "completed") current.revenue += b.priceEstimate;
      byService.set(name, current);
    }

    // Demand by day of week
    const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const byDay = new Array(7).fill(0);
    for (const b of bookings) {
      byDay[new Date(b.scheduledAt).getDay()]! += 1;
    }

    // Demand by zone (from address area — use mock zones for provider's service area)
    const DEMO_ZONES = ["Jumeirah 3", "Downtown Dubai", "Dubai Hills", "Al Qouz"];
    const byZone = new Map<string, number>();
    for (const b of bookings) {
      const zone = DEMO_ZONES[b.id % DEMO_ZONES.length]!;
      byZone.set(zone, (byZone.get(zone) ?? 0) + 1);
    }

    const completed  = bookings.filter(b => b.status === "completed");
    const all        = bookings.filter(b => b.status !== "pending");
    const completionRate = all.length ? (completed.length / all.length) * 100 : 97.1;

    const reviews = await db.select({ rating: reviewsTable.rating }).from(reviewsTable).where(eq(reviewsTable.providerId, provider.id));
    const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : provider.rating;

    // Repeat booking rate: % of members who booked more than once
    const memberCounts = new Map<number, number>();
    for (const b of bookings) memberCounts.set(b.memberId, (memberCounts.get(b.memberId) ?? 0) + 1);
    const repeatRate = memberCounts.size > 0
      ? ([...memberCounts.values()].filter(c => c > 1).length / memberCounts.size) * 100
      : 38.0;

    // Capacity utilization: completed this month / total slots this month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const completedThisMonth = completed.filter(b => new Date(b.scheduledAt) >= startOfMonth).length;
    const capacityUtilization = Math.min(100, (completedThisMonth / 10) * 100); // assume 10 slots/month for demo

    // Demand forecast: 60% × 4-week avg + 40% × prior-period avg
    const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60_000);
    const eightWeeksAgo = new Date(now.getTime() - 56 * 24 * 60 * 60_000);
    const recentCount = bookings.filter(b => new Date(b.scheduledAt) >= fourWeeksAgo && new Date(b.scheduledAt) <= now).length;
    const priorCount  = bookings.filter(b => new Date(b.scheduledAt) >= eightWeeksAgo && new Date(b.scheduledAt) < fourWeeksAgo).length;
    const forecastEstimate = Math.round(0.6 * recentCount + 0.4 * (priorCount || recentCount));

    res.json({
      demandByService: [...byService.entries()].map(([serviceName, v]) => ({ serviceName, ...v })).sort((a, b) => b.bookings - a.bookings),
      demandByDay: DAY_LABELS.map((dayLabel, i) => ({ dayLabel, bookings: byDay[i] ?? 0 })),
      demandByZone: [...byZone.entries()].map(([zone, bookings]) => ({ zone, bookings })).sort((a, b) => b.bookings - a.bookings),
      completionRate: Math.round(completionRate * 10) / 10,
      averageRating: Math.round(avgRating * 10) / 10,
      repeatBookingRate: Math.round(repeatRate * 10) / 10,
      capacityUtilization: Math.round(capacityUtilization * 10) / 10,
      forecast: {
        estimate: Math.max(forecastEstimate, recentCount + 1),
        confidence: 0.78,
        method: "60% × 4-week average + 40% × prior-period average. Operational estimate only — no ML model is used.",
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    logger.error({ err }, "getProviderAnalytics failed");
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

export default router;
