import { and, desc, eq, inArray, asc } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import {
  db,
  employeesTable,
  institutionsTable,
  campusesTable,
  benefitTiersTable,
  benefitPlansTable,
  providersTable,
  categoriesTable,
  servicesTable,
  bookingsTable,
  bookingEventsTable,
  allowanceLedgerTable,
  providerQualityFlagsTable,
  supportIncidentsTable,
  membersTable,
  bookingStatusHistoryTable,
} from "@workspace/db";
import { fetchBookingViews } from "../lib/loup";

const router: IRouter = Router();

// ── Role guard ────────────────────────────────────────────────────────────────
// Production: admin endpoints are blocked until real auth (signed JWT admin claim) is implemented.
// Demo/dev: header-based check is explicitly confined to the development environment.
function requireAdminRole(req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV === "production") {
    res.status(403).json({ error: "Admin access requires authentication (production mode)" });
    return;
  }
  const role = (req.headers["x-loup-demo-role"] as string | undefined)?.toLowerCase();
  if (role !== "admin") {
    res.status(403).json({ error: "Forbidden: admin role required. Pass x-loup-demo-role: admin" });
    return;
  }
  next();
}

router.use(requireAdminRole);

// ── Admin overview ────────────────────────────────────────────────────────────

router.get("/v1/admin/overview", async (_req, res): Promise<void> => {
  const [institutions, employees, allBookings, ledger, openFlags, providerRows] = await Promise.all([
    db.select({ id: institutionsTable.id }).from(institutionsTable).where(eq(institutionsTable.active, true)),
    db.select({ id: employeesTable.id }).from(employeesTable),
    db.select({ id: bookingsTable.id, createdAt: bookingsTable.createdAt }).from(bookingsTable),
    db.select({ amount: allowanceLedgerTable.amount, entryType: allowanceLedgerTable.entryType }).from(allowanceLedgerTable),
    db.select({ id: providerQualityFlagsTable.id }).from(providerQualityFlagsTable).where(eq(providerQualityFlagsTable.status, "pending_review")),
    db.select({ id: providersTable.id }).from(providersTable),
  ]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const bookingsToday = allBookings.filter(b => new Date(b.createdAt) >= todayStart).length;
  const platformRevenue = ledger.filter(l => l.entryType === "redeemed").reduce((s, l) => s + l.amount, 0);

  res.json({
    totalInstitutions: institutions.length,
    totalEmployees: employees.length,
    bookingsToday,
    platformRevenueEstimate: Math.round(platformRevenue),
    qualityWarningsCount: openFlags.length,
    activeProviders: providerRows.length,
  });
});

// ── Institution management ────────────────────────────────────────────────────

router.get("/v1/admin/institutions", async (_req, res): Promise<void> => {
  const [institutions, campuses, employees] = await Promise.all([
    db.select().from(institutionsTable).orderBy(institutionsTable.name),
    db.select({ id: campusesTable.id, institutionId: campusesTable.institutionId, name: campusesTable.name }).from(campusesTable),
    db.select({ id: employeesTable.id, institutionId: employeesTable.institutionId }).from(employeesTable),
  ]);

  const result = institutions.map(inst => ({
    id: inst.id,
    name: inst.name,
    slug: inst.slug,
    type: inst.type,
    city: inst.city,
    country: inst.country,
    active: inst.active,
    campusCount: campuses.filter(c => c.institutionId === inst.id).length,
    campuses: campuses.filter(c => c.institutionId === inst.id).map(c => ({ id: c.id, name: c.name })),
    employeeCount: employees.filter(e => e.institutionId === inst.id).length,
    createdAt: inst.createdAt.toISOString(),
  }));

  res.json(result);
});

router.post("/v1/admin/institutions", async (req, res): Promise<void> => {
  const { name, type = "school", city = "Dubai", country = "AE" } = req.body as {
    name: string; type?: string; city?: string; country?: string;
  };
  if (!name) { res.status(400).json({ error: "name is required" }); return; }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now();
  const [institution] = await db.insert(institutionsTable).values({ name, slug, type, city, country, active: true }).returning();

  res.status(201).json({ ...institution, campusCount: 0, campuses: [], employeeCount: 0, createdAt: institution!.createdAt.toISOString() });
});

router.patch("/v1/admin/institutions/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id ?? "0");
  const { name, active, city } = req.body as { name?: string; active?: boolean; city?: string };

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (active !== undefined) updates.active = active;
  if (city !== undefined) updates.city = city;

  const [updated] = await db.update(institutionsTable).set(updates).where(eq(institutionsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Institution not found" }); return; }
  res.json({ ...updated, createdAt: updated.createdAt.toISOString() });
});

router.post("/v1/admin/institutions/:id/campuses", async (req, res): Promise<void> => {
  const institutionId = parseInt(req.params.id ?? "0");
  const { name, city = "Dubai" } = req.body as { name: string; city?: string };
  if (!name) { res.status(400).json({ error: "name is required" }); return; }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now();
  const [campus] = await db.insert(campusesTable).values({ institutionId, name, slug, city, active: true }).returning();
  res.status(201).json({ ...campus, createdAt: campus!.createdAt.toISOString() });
});

// ── Provider management ───────────────────────────────────────────────────────

router.get("/v1/admin/providers", async (_req, res): Promise<void> => {
  const [providers, cats, flags, incidents] = await Promise.all([
    db.select().from(providersTable),
    db.select().from(categoriesTable),
    db.select().from(providerQualityFlagsTable).orderBy(desc(providerQualityFlagsTable.createdAt)),
    db.select({ id: supportIncidentsTable.id, bookingId: supportIncidentsTable.bookingId, status: supportIncidentsTable.status })
      .from(supportIncidentsTable),
  ]);

  // Quality engine: auto-flag providers with rating < threshold
  const RATING_THRESHOLD = 4.0;
  const existingProviderFlags = new Set(
    flags.filter(f => f.flagType === "low_rating" && (f.status === "pending_review" || f.status === "under_review")).map(f => f.providerId)
  );

  const newFlags: { providerId: number; flagType: string; threshold: number; currentValue: number }[] = [];
  for (const p of providers) {
    if (p.rating < RATING_THRESHOLD && !existingProviderFlags.has(p.id)) {
      newFlags.push({ providerId: p.id, flagType: "low_rating", threshold: RATING_THRESHOLD, currentValue: p.rating });
    }
  }
  if (newFlags.length > 0) {
    await db.insert(providerQualityFlagsTable).values(newFlags.map(f => ({ ...f, status: "pending_review" })));
  }

  const freshFlags = newFlags.length > 0
    ? await db.select().from(providerQualityFlagsTable)
    : flags;

  const catMap = new Map(cats.map(c => [c.id, c.name]));

  const result = providers.map(p => {
    const provFlags = freshFlags.filter(f => f.providerId === p.id);
    const openFlags = provFlags.filter(f => f.status === "pending_review" || f.status === "under_review");
    return {
      id: p.id,
      name: p.name,
      tagline: p.tagline,
      categoryId: p.categoryId,
      categoryName: catMap.get(p.categoryId) ?? "Unknown",
      rating: p.rating,
      reviewCount: p.reviewCount,
      jobsCompleted: p.jobsCompleted,
      yearsOnPlatform: p.yearsOnPlatform,
      verified: p.verified,
      availableNow: p.availableNow,
      startingPrice: p.startingPrice,
      badges: p.badges,
      status: p.verified ? "active" : "pending",
      openFlagCount: openFlags.length,
      hasOpenFlag: openFlags.length > 0,
      reducedRouting: openFlags.length > 0,
      qualityFlags: openFlags.map(f => ({ id: f.id, flagType: f.flagType, currentValue: f.currentValue, threshold: f.threshold })),
    };
  });

  res.json(result);
});

router.patch("/v1/admin/providers/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id ?? "0");
  const { action, verified, availableNow } = req.body as { action?: "approve" | "suspend"; verified?: boolean; availableNow?: boolean };

  const updates: Record<string, unknown> = {};
  if (action === "approve") updates.verified = true;
  else if (action === "suspend") updates.verified = false;
  if (verified !== undefined) updates.verified = verified;
  if (availableNow !== undefined) updates.availableNow = availableNow;

  const [updated] = await db.update(providersTable).set(updates).where(eq(providersTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Provider not found" }); return; }
  res.json(updated);
});

// ── Quality flags ─────────────────────────────────────────────────────────────

router.get("/v1/admin/quality-flags", async (_req, res): Promise<void> => {
  const [flags, providerRows] = await Promise.all([
    db.select().from(providerQualityFlagsTable).orderBy(desc(providerQualityFlagsTable.createdAt)),
    db.select({ id: providersTable.id, name: providersTable.name }).from(providersTable),
  ]);

  const provMap = new Map(providerRows.map(p => [p.id, p.name]));
  res.json(flags.map(f => ({
    id: f.id,
    providerId: f.providerId,
    providerName: provMap.get(f.providerId) ?? "Unknown",
    flagType: f.flagType,
    threshold: f.threshold,
    currentValue: f.currentValue,
    status: f.status,
    reviewedAt: f.reviewedAt?.toISOString() ?? null,
    createdAt: f.createdAt.toISOString(),
  })));
});

router.patch("/v1/admin/quality-flags/:id", async (req, res): Promise<void> => {
  const flagId = parseInt(req.params.id ?? "0");
  const { status } = req.body as { status: string };
  if (!status) { res.status(400).json({ error: "status is required" }); return; }

  const updates: Record<string, unknown> = { status };
  if (status === "resolved" || status === "dismissed") updates.reviewedAt = new Date();

  const [updated] = await db.update(providerQualityFlagsTable).set(updates).where(eq(providerQualityFlagsTable.id, flagId)).returning();
  if (!updated) { res.status(404).json({ error: "Flag not found" }); return; }
  res.json({ ...updated, reviewedAt: updated.reviewedAt?.toISOString() ?? null, createdAt: updated.createdAt.toISOString() });
});

// ── Category management ───────────────────────────────────────────────────────

router.get("/v1/admin/categories", async (_req, res): Promise<void> => {
  const [cats, providerRows, services] = await Promise.all([
    db.select().from(categoriesTable).orderBy(categoriesTable.name),
    db.select({ id: providersTable.id, categoryId: providersTable.categoryId }).from(providersTable),
    db.select({ id: servicesTable.id, providerId: servicesTable.providerId }).from(servicesTable),
  ]);

  const provCatMap = new Map(providerRows.map(p => [p.id, p.categoryId]));
  res.json(cats.map(cat => ({
    ...cat,
    providerCount: providerRows.filter(p => p.categoryId === cat.id).length,
    serviceCount: services.filter(s => provCatMap.get(s.providerId) === cat.id).length,
  })));
});

router.post("/v1/admin/categories", async (req, res): Promise<void> => {
  const { name, tagline = "", icon = "Sparkles", startingPrice = 0 } = req.body as {
    name: string; tagline?: string; icon?: string; startingPrice?: number;
  };
  if (!name) { res.status(400).json({ error: "name is required" }); return; }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now();
  const [cat] = await db.insert(categoriesTable).values({ name, slug, tagline, icon, startingPrice }).returning();
  res.status(201).json({ ...cat, providerCount: 0, serviceCount: 0 });
});

router.patch("/v1/admin/categories/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id ?? "0");
  const { name, tagline, startingPrice } = req.body as { name?: string; tagline?: string; startingPrice?: number };

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (tagline !== undefined) updates.tagline = tagline;
  if (startingPrice !== undefined) updates.startingPrice = startingPrice;

  const [updated] = await db.update(categoriesTable).set(updates).where(eq(categoriesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Category not found" }); return; }
  res.json(updated);
});

// ── Service management ────────────────────────────────────────────────────────

router.get("/v1/admin/services", async (_req, res): Promise<void> => {
  const [services, providerRows, cats] = await Promise.all([
    db.select().from(servicesTable).orderBy(servicesTable.name),
    db.select({ id: providersTable.id, name: providersTable.name, categoryId: providersTable.categoryId }).from(providersTable),
    db.select({ id: categoriesTable.id, name: categoriesTable.name }).from(categoriesTable),
  ]);

  const provMap = new Map(providerRows.map(p => [p.id, p]));
  const catMap = new Map(cats.map(c => [c.id, c.name]));

  res.json(services.map(s => {
    const prov = provMap.get(s.providerId);
    return {
      ...s,
      providerName: prov?.name ?? "Unknown",
      categoryId: prov?.categoryId ?? null,
      categoryName: prov?.categoryId ? (catMap.get(prov.categoryId) ?? "Unknown") : "Unknown",
    };
  }));
});

router.post("/v1/admin/services", async (req, res): Promise<void> => {
  const { providerId, name, description = "", price, durationMinutes = 60 } = req.body as {
    providerId: number; name: string; description?: string; price: number; durationMinutes?: number;
  };
  if (!providerId || !name || price === undefined) {
    res.status(400).json({ error: "providerId, name, and price are required" });
    return;
  }
  const [service] = await db.insert(servicesTable).values({ providerId, name, description, price, durationMinutes }).returning();
  res.status(201).json(service);
});

router.patch("/v1/admin/services/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id ?? "0");
  const { name, description, price, durationMinutes } = req.body as {
    name?: string; description?: string; price?: number; durationMinutes?: number;
  };

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (price !== undefined) updates.price = price;
  if (durationMinutes !== undefined) updates.durationMinutes = durationMinutes;

  const [updated] = await db.update(servicesTable).set(updates).where(eq(servicesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Service not found" }); return; }
  res.json(updated);
});

// ── Booking review ────────────────────────────────────────────────────────────

router.get("/v1/admin/bookings", async (req, res): Promise<void> => {
  const { status } = req.query as { status?: string };
  const bookings = await fetchBookingViews(status ? { statuses: [status] } : undefined);
  res.json(bookings.map(b => ({
    id: b.id,
    memberName: b.memberName,
    providerName: b.providerName,
    serviceName: b.serviceName,
    categoryName: b.categoryName,
    scheduledAt: b.scheduledAt,
    status: b.status,
    priceEstimate: b.priceEstimate,
    instructions: b.instructions ?? null,
  })));
});

router.patch("/v1/admin/bookings/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id ?? "0");
  const { status } = req.body as { status: string };
  if (!status) { res.status(400).json({ error: "status is required" }); return; }

  const [updated] = await db.update(bookingsTable).set({ status }).where(eq(bookingsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Booking not found" }); return; }
  res.json({ ...updated, scheduledAt: updated.scheduledAt.toISOString(), createdAt: updated.createdAt.toISOString() });
});

// ── Allowance ledger ──────────────────────────────────────────────────────────

router.get("/v1/admin/ledger", async (req, res): Promise<void> => {
  const { institution } = req.query as { institution?: string };

  const [ledger, employees] = await Promise.all([
    db.select().from(allowanceLedgerTable).orderBy(desc(allowanceLedgerTable.createdAt)).limit(200),
    db.select({ id: employeesTable.id, name: employeesTable.name, institutionId: employeesTable.institutionId }).from(employeesTable),
  ]);

  const empMap = new Map(employees.map(e => [e.id, e]));

  const filtered = institution
    ? ledger.filter(l => empMap.get(l.employeeId)?.institutionId?.toString() === institution)
    : ledger;

  res.json(filtered.map(l => ({
    id: l.id,
    employeeId: l.employeeId,
    employeeName: empMap.get(l.employeeId)?.name ?? "Unknown",
    entryType: l.entryType,
    amount: l.amount,
    referenceType: l.referenceType ?? null,
    referenceId: l.referenceId ?? null,
    note: l.note ?? null,
    createdByRole: l.createdByRole ?? null,
    createdAt: l.createdAt.toISOString(),
  })));
});

// ── Support incidents ─────────────────────────────────────────────────────────

router.get("/v1/admin/incidents", async (req, res): Promise<void> => {
  const { status } = req.query as { status?: string };

  const [incidents, bookingRows, employeeRows, providerRows, memberRows] = await Promise.all([
    db.select().from(supportIncidentsTable)
      .orderBy(desc(supportIncidentsTable.createdAt)),
    db.select({
      id: bookingsTable.id,
      status: bookingsTable.status,
      scheduledAt: bookingsTable.scheduledAt,
      priceEstimate: bookingsTable.priceEstimate,
      providerId: bookingsTable.providerId,
      memberId: bookingsTable.memberId,
    }).from(bookingsTable),
    db.select({ id: employeesTable.id, name: employeesTable.name }).from(employeesTable),
    db.select({ id: providersTable.id, name: providersTable.name }).from(providersTable),
    db.select({ id: membersTable.id, name: membersTable.name }).from(membersTable),
  ]);

  const bookingMap = new Map(bookingRows.map(b => [b.id, b]));
  const employeeMap = new Map(employeeRows.map(e => [e.id, e.name]));
  const providerMap = new Map(providerRows.map(p => [p.id, p.name]));
  const memberMap = new Map(memberRows.map(m => [m.id, m.name]));

  const filtered = status
    ? incidents.filter(i => i.status === status)
    : incidents;

  res.json(filtered.map(i => {
    const booking = i.bookingId ? bookingMap.get(i.bookingId) : null;
    return {
      id: i.id,
      bookingId: i.bookingId,
      bookingStatus: booking?.status ?? null,
      bookingScheduledAt: booking?.scheduledAt?.toISOString() ?? null,
      bookingPriceEstimate: booking?.priceEstimate ?? null,
      employeeId: i.employeeId,
      employeeName: i.employeeId ? (employeeMap.get(i.employeeId) ?? "Unknown") : null,
      providerName: booking?.providerId ? (providerMap.get(booking.providerId) ?? "Unknown") : null,
      memberName: booking?.memberId ? (memberMap.get(booking.memberId) ?? "Unknown") : null,
      category: i.category,
      description: i.description,
      status: i.status,
      resolution: i.resolution ?? null,
      createdAt: i.createdAt.toISOString(),
      resolvedAt: i.resolvedAt?.toISOString() ?? null,
    };
  }));
});

const INCIDENT_STATUSES = ["open", "investigating", "resolved", "closed"] as const;
type IncidentStatus = typeof INCIDENT_STATUSES[number];

// Terminal booking statuses that must never be reverted when resolving an incident
const TERMINAL_BOOKING_STATUSES = new Set(["completed", "cancelled", "rejected"]);

router.patch("/v1/admin/incidents/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id ?? "0");
  const { status, resolution } = req.body as { status?: string; resolution?: string };

  if (!status) { res.status(400).json({ error: "status is required" }); return; }
  if (!(INCIDENT_STATUSES as readonly string[]).includes(status)) {
    res.status(400).json({ error: `status must be one of: ${INCIDENT_STATUSES.join(", ")}` });
    return;
  }

  const [existing] = await db.select().from(supportIncidentsTable).where(eq(supportIncidentsTable.id, id));
  if (!existing) { res.status(404).json({ error: "Incident not found" }); return; }

  const isClosing = status === "resolved" || status === "closed";
  const updates: Record<string, unknown> = { status };
  if (resolution !== undefined) updates.resolution = resolution;
  if (isClosing) updates.resolvedAt = new Date();

  // Wrap incident update + optional booking restoration in a single transaction so a failure
  // midway cannot leave an incident resolved while its booking stays disputed.
  let updated: typeof existing;
  await db.transaction(async (tx) => {
    const [inc] = await tx.update(supportIncidentsTable)
      .set(updates)
      .where(eq(supportIncidentsTable.id, id))
      .returning();
    updated = inc!;

    if (isClosing && existing.bookingId) {
      const [booking] = await tx
        .select({ status: bookingsTable.status })
        .from(bookingsTable)
        .where(eq(bookingsTable.id, existing.bookingId));

      if (booking?.status === "disputed") {
        // Look up the exact status the booking held before it was marked disputed.
        // Restoring to this preserves terminal states (completed, cancelled, rejected)
        // so resolution never reopens a booking that was already finished.
        const history = await tx
          .select({ fromStatus: bookingStatusHistoryTable.fromStatus })
          .from(bookingStatusHistoryTable)
          .where(
            and(
              eq(bookingStatusHistoryTable.bookingId, existing.bookingId),
              eq(bookingStatusHistoryTable.toStatus, "disputed"),
            ),
          )
          .orderBy(desc(bookingStatusHistoryTable.createdAt))
          .limit(1);

        const restoreTo = history[0]?.fromStatus ?? "confirmed";
        const note = `Incident #${id} resolved — booking status restored`;

        await Promise.all([
          tx.update(bookingsTable)
            .set({ status: restoreTo })
            .where(eq(bookingsTable.id, existing.bookingId)),

          // booking_events drives the customer/mobile timeline — must be kept in sync
          tx.insert(bookingEventsTable).values({
            bookingId: existing.bookingId,
            status: restoreTo,
            note,
            occurredAt: new Date(),
          }),

          // booking_status_history is the admin audit trail
          tx.insert(bookingStatusHistoryTable).values({
            bookingId: existing.bookingId,
            fromStatus: "disputed",
            toStatus: restoreTo,
            actorRole: "admin",
            note,
          }),
        ]);
      }
      // If the booking is not currently `disputed` its status is left unchanged.
    }
  });

  // Return the enriched AdminIncident shape (same contract as GET /v1/admin/incidents)
  const [bookingRow] = existing.bookingId
    ? await db
        .select({
          status: bookingsTable.status,
          scheduledAt: bookingsTable.scheduledAt,
          priceEstimate: bookingsTable.priceEstimate,
          providerId: bookingsTable.providerId,
          memberId: bookingsTable.memberId,
        })
        .from(bookingsTable)
        .where(eq(bookingsTable.id, existing.bookingId))
    : [undefined];

  const [employeeRow] = updated!.employeeId
    ? await db.select({ name: employeesTable.name }).from(employeesTable).where(eq(employeesTable.id, updated!.employeeId))
    : [undefined];

  const [providerRow] = bookingRow?.providerId
    ? await db.select({ name: providersTable.name }).from(providersTable).where(eq(providersTable.id, bookingRow.providerId))
    : [undefined];

  const [memberRow] = bookingRow?.memberId
    ? await db.select({ name: membersTable.name }).from(membersTable).where(eq(membersTable.id, bookingRow.memberId))
    : [undefined];

  res.json({
    id: updated!.id,
    bookingId: updated!.bookingId,
    bookingStatus: bookingRow?.status ?? null,
    bookingScheduledAt: bookingRow?.scheduledAt?.toISOString() ?? null,
    bookingPriceEstimate: bookingRow?.priceEstimate ?? null,
    employeeId: updated!.employeeId,
    employeeName: employeeRow?.name ?? null,
    providerName: providerRow?.name ?? null,
    memberName: memberRow?.name ?? null,
    category: updated!.category,
    description: updated!.description,
    status: updated!.status,
    resolution: updated!.resolution ?? null,
    createdAt: updated!.createdAt.toISOString(),
    resolvedAt: updated!.resolvedAt?.toISOString() ?? null,
  });
});

// ── Refund simulation (reverse a ledger entry — idempotent) ──────────────────

router.post("/v1/admin/ledger/:id/refund", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id ?? "0");
  const [entry] = await db.select().from(allowanceLedgerTable).where(eq(allowanceLedgerTable.id, id));
  if (!entry) { res.status(404).json({ error: "Ledger entry not found" }); return; }
  if (entry.entryType !== "redeemed") {
    res.status(400).json({ error: `Only 'redeemed' entries can be refunded; this entry is '${entry.entryType}'` });
    return;
  }

  // Idempotency guard: a redeemed entry may only be reversed once.
  const [existingReversal] = await db
    .select({ id: allowanceLedgerTable.id })
    .from(allowanceLedgerTable)
    .where(
      and(
        eq(allowanceLedgerTable.referenceType, "refund"),
        eq(allowanceLedgerTable.referenceId, entry.id),
        eq(allowanceLedgerTable.entryType, "released"),
      ),
    );
  if (existingReversal) {
    res.status(409).json({ error: "This entry has already been refunded", refundEntryId: existingReversal.id });
    return;
  }

  const [reversed] = await db.insert(allowanceLedgerTable).values({
    employerId: entry.employerId,
    employeeId: entry.employeeId,
    entryType: "released",
    amount: entry.amount,
    referenceType: "refund",
    referenceId: entry.id,
    note: `Admin refund of entry #${entry.id}`,
    createdByRole: "admin",
  }).returning();

  res.status(201).json({ ...reversed, createdAt: reversed!.createdAt.toISOString() });
});

export default router;
