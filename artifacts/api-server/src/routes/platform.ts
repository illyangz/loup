import { desc, eq, and, inArray, isNotNull, sql } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import {
  auditEventsTable,
  bookingsTable,
  db,
  employeesTable,
  employersTable,
  membersTable,
  routinesTable,
  allowanceLedgerTable,
  institutionsTable,
  campusesTable,
  benefitTiersTable,
  benefitPlansTable,
  supportIncidentsTable,
  servicesTable,
  providersTable,
  reviewsTable,
} from "@workspace/db";
import {
  GetEmployeeOverviewResponse,
  GetEmployeeAllocationResponse,
  SaveEmployeeAllocationBody,
  SaveEmployeeAllocationResponse,
  GetCheckoutPreviewResponse,
  GetCheckoutPreviewQueryParams,
  CreateSupportIssueBody,
  CreateSupportIssueResponse,
  GetEmployerIntegrationsResponse,
  GetEmployerOverviewResponse,
  GetEmployerUtilizationResponse,
  GetOperationsOverviewResponse,
  GetVendorForecastResponse,
  GetVendorPerformanceResponse,
  GetVendorTodayResponse,
  ImportEmployerEmployeesBody,
  ImportEmployerEmployeesResponse,
  ListAuditEventsResponse,
  ListDemoRolesResponse,
  DemoLoginBody,
  DemoLoginResponse,
  ListEmployerEmployeesResponse,
  ListServiceFitEvaluationsResponse,
} from "@workspace/api-zod";
import { estimateMonthlyPlatformRevenue, fetchBookingViews, getCurrentMember } from "../lib/loup";
import { computeAllowancePosition, computeCheckoutSplit } from "../lib/money";
import { getPrincipal, requireRole, signDemoToken, TOKEN_TTL_SECONDS, type DemoPrincipal } from "../lib/auth";

// ── Employer role guard + tenant resolver ─────────────────────────────────────
// Production: verify a signed JWT institution/employer claim and derive tenant from it.
// Demo: header-based role check is explicitly confined to the development/demo environment;
//       in production this middleware blocks all requests until real auth is implemented.
function requireEmployerRole(req: Request, res: Response, next: NextFunction): void {
  void requireRole("institution", "admin")(req, res, next);
}

/** Resolves the employer + institutionId from the authenticated principal's claims. */
async function resolveEmployerContext(req: Request, res: Response): Promise<{ employer: typeof employersTable.$inferSelect; institutionId: number | null }> {
  const principal = getPrincipal(req, res);
  if (!principal?.employerId) throw new Error("No employer context in token claims");
  const [employer] = await db.select().from(employersTable).where(eq(employersTable.id, principal.employerId));
  if (!employer) throw new Error("Employer not found for token claims");
  // institutionId is carried in the claims for institution logins; derive it
  // from the employer's employees as a fallback (e.g. admin tokens).
  const institutionId = principal.institutionId ?? null;
  if (institutionId === null) {
    const [empRow] = await db
      .select({ institutionId: employeesTable.institutionId })
      .from(employeesTable)
      .where(and(eq(employeesTable.employerId, employer.id), isNotNull(employeesTable.institutionId)))
      .limit(1);
    return { employer, institutionId: empRow?.institutionId ?? null };
  }
  return { employer, institutionId };
}


const router: IRouter = Router();

const activeCategories = [
  {
    slug: "household-admin",
    name: "Household & Life Admin",
    description: "Home cleaning, laundry, AC repair, and life admin — everything that keeps the home moving.",
    dimension: "Time wellbeing · Home wellbeing",
    publicPrice: 199,
    corporatePrice: 175,
    employerContribution: 120,
    employeeCopayment: 55,
    durationMinutes: 180,
    providerVerification: "Verified provider, background-checked crew",
  },
  {
    slug: "personal-wellbeing",
    name: "Personal Wellbeing",
    description: "Beauty at home, nurse visits, IV therapy — care that comes to you.",
    dimension: "Health wellbeing · Personal wellbeing",
    publicPrice: 220,
    corporatePrice: 195,
    employerContribution: 130,
    employeeCopayment: 65,
    durationMinutes: 60,
    providerVerification: "DHA-licensed practitioners",
  },
  {
    slug: "fitness-recovery",
    name: "Fitness & Recovery",
    description: "Physiotherapy, personal training and yoga at home or campus.",
    dimension: "Physical wellbeing · Performance",
    publicPrice: 250,
    corporatePrice: 220,
    employerContribution: 150,
    employeeCopayment: 70,
    durationMinutes: 60,
    providerVerification: "Certified trainers and registered physios",
  },
  {
    slug: "mobility-convenience",
    name: "Mobility & Convenience",
    description: "Grocery runs, errands and admin tasks handled while you focus on teaching.",
    dimension: "Time wellbeing · Convenience",
    publicPrice: 79,
    corporatePrice: 65,
    employerContribution: 40,
    employeeCopayment: 25,
    durationMinutes: 90,
    providerVerification: "Insured runner, tracked delivery",
  },
  {
    slug: "family-support",
    name: "Family & Dependent Support",
    description: "Childcare, school pickups and care companions for dependants.",
    dimension: "Family wellbeing · Time wellbeing",
    publicPrice: 120,
    corporatePrice: 105,
    employerContribution: 70,
    employeeCopayment: 35,
    durationMinutes: 180,
    providerVerification: "DBS-checked, first-aid certified",
  },
  {
    slug: "personal-development",
    name: "Personal Development",
    description: "Tutoring, language coaching and professional mentoring on demand.",
    dimension: "Career wellbeing · Personal growth",
    publicPrice: 150,
    corporatePrice: 130,
    employerContribution: 90,
    employeeCopayment: 40,
    durationMinutes: 60,
    providerVerification: "Qualified educators and certified coaches",
  },
  {
    slug: "recreation-lifestyle",
    name: "Recreation & Lifestyle",
    description: "Cooking classes, photography workshops and curated leisure experiences.",
    dimension: "Recreation · Life enrichment",
    publicPrice: 175,
    corporatePrice: 155,
    employerContribution: 100,
    employeeCopayment: 55,
    durationMinutes: 120,
    providerVerification: "Verified experience provider",
  },
];

const routineFallback = [
  {
    id: 1,
    label: "Weekly home care",
    categorySlug: "household-admin",
    frequency: "Weekly",
    preferredDay: "Saturday",
    preferredTime: "10:00",
    maxCopayment: 75,
    manualConfirmation: true,
    status: "active",
  },
  {
    id: 2,
    label: "Monthly physio session",
    categorySlug: "fitness-recovery",
    frequency: "Monthly",
    preferredDay: "First Friday",
    preferredTime: "09:00",
    maxCopayment: 100,
    manualConfirmation: true,
    status: "active",
  },
];

const roleChoices = [
  {
    role: "employee" as const,
    label: "Employee App",
    description: "Browse services, place bookings, and track your benefit allowance — all from one screen.",
    href: "/employee",
  },
  {
    role: "institution" as const,
    label: "Institution Portal",
    description: "Govern your institution's benefit programme, monitor adoption, and configure employee tiers.",
    href: "/institution",
  },
  {
    role: "provider" as const,
    label: "Provider Portal",
    description: "View assigned jobs, manage capacity, and track performance across all Meridian campuses.",
    href: "/provider",
  },
  {
    role: "admin" as const,
    label: "Loup Operations",
    description: "A calm control tower for provider matching, quality enforcement, and platform health.",
    href: "/admin",
  },
];

function asDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

router.get("/v1/demo/roles", (_req, res): void => {
  res.json(ListDemoRolesResponse.parse(roleChoices));
});

// ── Demo login: resolves a principal for the chosen role and signs a JWT ────
router.post("/v1/demo/login", async (req, res): Promise<void> => {
  const body = DemoLoginBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Invalid request body: role must be one of employee, institution, provider, admin" });
    return;
  }

  const role = body.data.role;
  let principal: DemoPrincipal;

  if (role === "employee") {
    const member = await getCurrentMember();
    if (!member) {
      res.status(500).json({ error: "No employee demo data seeded" });
      return;
    }
    const [employeeRow] = await db
      .select()
      .from(employeesTable)
      .where(eq(employeesTable.linkedMemberId, member.id));
    if (!employeeRow) {
      res.status(500).json({ error: "No employee demo data seeded" });
      return;
    }
    principal = {
      role,
      name: member.name,
      memberId: member.id,
      employeeId: employeeRow.id,
      employerId: employeeRow.employerId,
      institutionId: employeeRow.institutionId ?? undefined,
      label: "Omar Mansour — Faculty, Meridian Dubai Hills",
    };
} else if (role === "institution") {
    const slug = body.data.slug ?? "meridian";
    const [employer] = await db.select().from(employersTable).where(eq(employersTable.slug, slug));
    if (!employer) {
      res.status(400).json({ error: `Unknown tenant slug: ${slug}` });
      return;
    }
    const [empRow] = await db
      .select({ institutionId: employeesTable.institutionId })
      .from(employeesTable)
      .where(and(eq(employeesTable.employerId, employer.id), isNotNull(employeesTable.institutionId)))
      .limit(1);
    principal = {
      role,
      name: employer.name,
      employerId: employer.id,
      institutionId: empRow?.institutionId ?? undefined,
      label: `${employer.name} — Benefits Administrator`,
    };
  } else if (role === "provider") {
    const [provider] = await db
      .select()
      .from(providersTable)
      .where(eq(providersTable.name, "Marina Shine Cleaning"));
    if (!provider) {
      res.status(500).json({ error: "No provider demo data seeded" });
      return;
    }
    principal = {
      role,
      name: provider.name,
      providerId: provider.id,
      label: "Marina Shine Cleaning — Provider Portal",
    };
  } else {
    principal = {
      role: "admin",
      name: "Loup Operations",
      label: "Loup Operations — Control Tower",
    };
  }

  const token = await signDemoToken(principal);
  res.json(DemoLoginResponse.parse({
    token,
    expiresInSeconds: TOKEN_TTL_SECONDS,
    principal,
  }));
});

router.get("/v1/employee/overview", async (req, res): Promise<void> => {
  const member = await getCurrentMember();
  if (!member) {
    res.status(500).json({ error: "No employee demo data seeded" });
    return;
  }

  // Find the employee row linked to this member
  const [employeeRow] = await db
    .select()
    .from(employeesTable)
    .where(eq(employeesTable.linkedMemberId, member.id));

  // Separately load institution / campus / tier (avoids Drizzle join column-alias conflicts)
  const [institution] = employeeRow?.institutionId
    ? await db.select().from(institutionsTable).where(eq(institutionsTable.id, employeeRow.institutionId))
    : [];
  const [campus] = employeeRow?.campusId
    ? await db.select().from(campusesTable).where(eq(campusesTable.id, employeeRow.campusId))
    : [];
  const [tier] = employeeRow?.tierId
    ? await db.select().from(benefitTiersTable).where(eq(benefitTiersTable.id, employeeRow.tierId))
    : [];

  const [employer] = employeeRow
    ? await db.select().from(employersTable).where(eq(employersTable.id, employeeRow.employerId))
    : [];

  // Derive real allowance balances from ledger
  let authorized = 750, reserved = 0, redeemed = 0;
  if (employeeRow) {
    const ledger = await db
      .select()
      .from(allowanceLedgerTable)
      .where(eq(allowanceLedgerTable.employeeId, employeeRow.id));
    authorized = ledger.filter(r => r.entryType === "authorized").reduce((s, r) => s + r.amount, 0) || 750;
    reserved = ledger.filter(r => r.entryType === "reserved").reduce((s, r) => s + r.amount, 0);
    redeemed = ledger.filter(r => r.entryType === "redeemed").reduce((s, r) => s + r.amount, 0);
  }
  const available = Math.max(0, authorized - reserved - redeemed);

  // Renewal date = first day of next month
  const now = new Date();
  const renewal = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const renewalDate = renewal.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });

  const upcoming = (
    await fetchBookingViews({ statuses: ["pending", "confirmed"] })
  ).find((booking) => asDate(booking.scheduledAt).getTime() >= Date.now());

  const routines = await db
    .select({
      id: routinesTable.id,
      label: routinesTable.label,
      categorySlug: routinesTable.categorySlug,
      frequency: routinesTable.frequency,
      preferredDay: routinesTable.preferredDay,
      preferredTime: routinesTable.preferredTime,
      maxCopayment: routinesTable.maxCopayment,
      manualConfirmation: routinesTable.manualConfirmation,
      status: routinesTable.status,
    })
    .from(routinesTable)
    .where(eq(routinesTable.memberId, member.id));

  const completedBookings = await fetchBookingViews({ statuses: ["completed"] });
  const timeSavedMinutes = completedBookings.length * 90;
  const employerSupport = Math.round(redeemed * 0.7);

  req.log.info({ role: "employee", employeeId: employeeRow?.id }, "Serving employee platform overview");
  res.json(
    GetEmployeeOverviewResponse.parse({
      employeeName: member.name,
      employerName: employer?.name ?? "Meridian Education Group",
      institutionName: institution?.name ?? "Meridian International Schools",
      campusName: campus?.name ?? "Dubai Hills Campus",
      benefitTierName: tier?.name ?? employeeRow?.benefitTier ?? "Faculty",
      benefitTierAllowance: tier?.monthlyAllowance ?? 750,
      allowance: {
        authorized,
        reserved,
        redeemed,
        available,
        renewalDate,
        expiration: "Unused allowance expires at the end of each benefit period.",
      },
      upcomingBooking: upcoming ?? null,
      metrics: {
        employerSupport: employerSupport || 630,
        corporateSavings: Math.round(redeemed * 0.15) || 108,
        servicesCompleted: completedBookings.length || 7,
        estimatedTimeSavedMinutes: timeSavedMinutes || 690,
        householdAllocations: 210,
      },
      activeCategories,
      routines: routines.length > 0 ? routines : routineFallback,
    }),
  );
});

// ── Allocation Preferences ────────────────────────────────────────────────────

router.get("/v1/employee/allocation", async (req, res): Promise<void> => {
  const member = await getCurrentMember();
  if (!member) { res.status(500).json({ error: "No employee data" }); return; }

  const [employeeRow] = await db
    .select({ id: employeesTable.id, allocationPrefs: employeesTable.allocationPrefs, tierId: employeesTable.tierId })
    .from(employeesTable)
    .where(eq(employeesTable.linkedMemberId, member.id));

  // Determine total allowance from tier or ledger
  let tierAllowance = 750;
  if (employeeRow?.tierId) {
    const [tier] = await db.select({ monthlyAllowance: benefitTiersTable.monthlyAllowance })
      .from(benefitTiersTable).where(eq(benefitTiersTable.id, employeeRow.tierId));
    tierAllowance = tier?.monthlyAllowance ?? 750;
  }

  // Build category allocation list — use saved prefs or equal-split defaults
  const savedPrefs = (employeeRow?.allocationPrefs as { allocations?: { slug: string; name: string; amount: number }[] } | null)?.allocations ?? null;
  const allocations = savedPrefs ?? activeCategories.map(cat => ({
    slug: cat.slug,
    name: cat.name,
    amount: Math.floor(tierAllowance / activeCategories.length),
  }));

  const allocated = allocations.reduce((s: number, a: { amount: number }) => s + a.amount, 0);
  res.json(GetEmployeeAllocationResponse.parse({
    totalAllowance: tierAllowance,
    allocated,
    remaining: tierAllowance - allocated,
    allocations,
  }));
});

router.patch("/v1/employee/allocation", async (req, res): Promise<void> => {
  const parsed = SaveEmployeeAllocationBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const member = await getCurrentMember();
  if (!member) { res.status(500).json({ error: "No employee data" }); return; }

  const [employeeRow] = await db
    .select({ id: employeesTable.id, tierId: employeesTable.tierId })
    .from(employeesTable)
    .where(eq(employeesTable.linkedMemberId, member.id));
  if (!employeeRow) { res.status(404).json({ error: "Employee not found" }); return; }

  let tierAllowance = 750;
  if (employeeRow.tierId) {
    const [tier] = await db.select({ monthlyAllowance: benefitTiersTable.monthlyAllowance })
      .from(benefitTiersTable).where(eq(benefitTiersTable.id, employeeRow.tierId));
    tierAllowance = tier?.monthlyAllowance ?? 750;
  }

  const total = parsed.data.allocations.reduce((s, a) => s + a.amount, 0);
  if (total > tierAllowance) {
    res.status(400).json({ error: `Total allocation (${total}) exceeds allowance (${tierAllowance})` });
    return;
  }

  await db.update(employeesTable)
    .set({ allocationPrefs: { allocations: parsed.data.allocations } })
    .where(eq(employeesTable.id, employeeRow.id));

  res.json(SaveEmployeeAllocationResponse.parse({
    totalAllowance: tierAllowance,
    allocated: total,
    remaining: tierAllowance - total,
    allocations: parsed.data.allocations,
  }));
});

// ── Checkout Preview ──────────────────────────────────────────────────────────

router.get("/v1/employee/checkout-preview", async (req, res): Promise<void> => {
  const query = GetCheckoutPreviewQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }

  const [service] = await db
    .select({ id: servicesTable.id, name: servicesTable.name, price: servicesTable.price, providerId: servicesTable.providerId })
    .from(servicesTable)
    .where(eq(servicesTable.id, query.data.serviceId));
  if (!service) { res.status(404).json({ error: "Service not found" }); return; }

  const [provider] = await db
    .select({ name: providersTable.name })
    .from(providersTable)
    .where(eq(providersTable.id, service.providerId));

  const member = await getCurrentMember();
  const [employeeRow] = member
    ? await db.select({ id: employeesTable.id }).from(employeesTable).where(eq(employeesTable.linkedMemberId, member.id))
    : [undefined];

  // Derive available allowance from ledger
  let availableAllowance = 0;
  if (employeeRow) {
    const ledger = await db.select().from(allowanceLedgerTable).where(eq(allowanceLedgerTable.employeeId, employeeRow.id));
    availableAllowance = computeAllowancePosition(ledger, 0).available;
  }

  const split = computeCheckoutSplit({ publicPrice: service.price, availableAllowance });

  res.json(GetCheckoutPreviewResponse.parse({
    serviceId: service.id,
    serviceName: service.name,
    providerName: provider?.name ?? "Provider",
    publicPrice: service.price,
    institutionalPrice: split.institutionalPrice,
    institutionalSaving: split.institutionalSaving,
    availableAllowance,
    employerContribution: split.employerContribution,
    employeeCopayment: split.employeeCopayment,
  }));
});

// ── Support Issues ────────────────────────────────────────────────────────────

router.post("/v1/employee/issues", async (req, res): Promise<void> => {
  const parsed = CreateSupportIssueBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const member = await getCurrentMember();
  const [employeeRow] = member
    ? await db.select({ id: employeesTable.id }).from(employeesTable).where(eq(employeesTable.linkedMemberId, member.id))
    : [undefined];

  const [issue] = await db
    .insert(supportIncidentsTable)
    .values({
      bookingId: parsed.data.bookingId ?? null,
      employeeId: employeeRow?.id ?? null,
      category: parsed.data.category ?? "general",
      description: parsed.data.description,
      status: "open",
    })
    .returning();

  req.log.info({ issueId: issue!.id }, "Support issue created");
  res.status(201).json(CreateSupportIssueResponse.parse({
    id: issue!.id,
    status: issue!.status,
    createdAt: issue!.createdAt.toISOString(),
  }));
});

router.get("/v1/employer/overview", requireEmployerRole, async (req, res): Promise<void> => {
  const { employer, institutionId } = await resolveEmployerContext(req, res);
  const [employees, ledger] = await Promise.all([
    db.select({ id: employeesTable.id, linkedMemberId: employeesTable.linkedMemberId, tierId: employeesTable.tierId })
      .from(employeesTable).where(eq(employeesTable.employerId, employer.id)),
    db.select({ amount: allowanceLedgerTable.amount, entryType: allowanceLedgerTable.entryType })
      .from(allowanceLedgerTable).where(eq(allowanceLedgerTable.employerId, employer.id)),
  ]);
  // Scope reviews + bookings to this employer's linked members
  const memberIds = employees.filter(e => e.linkedMemberId !== null).map(e => e.linkedMemberId!);
  const [reviewRows, bookings] = await Promise.all([
    memberIds.length > 0
      ? db.select({ rating: reviewsTable.rating }).from(reviewsTable)
          .innerJoin(bookingsTable, eq(reviewsTable.bookingId, bookingsTable.id))
          .where(inArray(bookingsTable.memberId, memberIds))
      : Promise.resolve<{ rating: number }[]>([]),
    fetchBookingViews(),
  ]);
  const bookingViews = memberIds.length > 0 ? bookings.filter(b => memberIds.includes(b.memberId)) : bookings;

  const eligibleEmployees = employees.length;
  const activatedEmployees = employees.filter(e => e.linkedMemberId !== null).length;
  const ledgerAuthorized = ledger.filter(l => l.entryType === "authorized").reduce((s, l) => s + l.amount, 0);
  // Fallback: derive the authorized maximum from the roster's tier allowances so
  // tenants without ledger history (e.g. Al Noor) show real numbers, not constants.
  let tierAuthorized = 0;
  if (!ledgerAuthorized && eligibleEmployees > 0) {
    const tierIds = [...new Set(employees.map(e => e.tierId).filter((t): t is number => t != null))];
    const tierRows = tierIds.length > 0
      ? await db.select({ id: benefitTiersTable.id, monthlyAllowance: benefitTiersTable.monthlyAllowance })
          .from(benefitTiersTable).where(inArray(benefitTiersTable.id, tierIds))
      : [];
    const byTier = new Map(tierRows.map(t => [t.id, t.monthlyAllowance]));
    tierAuthorized = employees.reduce((s, e) => s + (e.tierId ? (byTier.get(e.tierId) ?? 0) : 0), 0);
  }
  const position = computeAllowancePosition(ledger, tierAuthorized);
  const authorizedMaximum = position.authorized;
  const redeemedAllowances = position.redeemed;
  const reservedAllowances = position.reserved;

  const completed = bookingViews.filter(b => b.status === "completed");
  const nonPending = bookingViews.filter(b => b.status !== "pending");
  const completionRate = nonPending.length > 0
    ? Math.round((completed.length / nonPending.length) * 1000) / 10
    : 0;
  const avgRating = reviewRows.length > 0
    ? Math.round(reviewRows.reduce((s, r) => s + r.rating, 0) / reviewRows.length * 10) / 10
    : 0;

  const forecastRedemptions = Math.round((authorizedMaximum ? authorizedMaximum * 0.8 : 0) * 100) / 100;
  const invoiceEstimate = Math.round((redeemedAllowances + reservedAllowances) * 100) / 100;

  const fee = await estimateMonthlyPlatformRevenue(institutionId);
  const tenantEstimate = fee.byInstitution.find((row) => row.institutionId === institutionId);
  const platformFeeRatePct = tenantEstimate?.feeRatePct ?? 8;
  const perEmployeeMonthlyFee = tenantEstimate?.perEmployeeMonthlyFee ?? 0;
  const estimatedMonthlyPlatformRevenue = tenantEstimate?.monthly ?? 0;

  res.json(GetEmployerOverviewResponse.parse({
    employerName: employer.name,
    eligibleEmployees,
    activatedEmployees,
    authorizedMaximum,
    redeemedAllowances,
    reservedAllowances,
    forecastRedemptions,
    invoiceEstimate,
    completionRate,
    satisfaction: avgRating,
    platformFeeRatePct,
    perEmployeeMonthlyFee,
    estimatedMonthlyPlatformRevenue,
  }));
});

router.get("/v1/employer/employees", requireEmployerRole, async (req, res): Promise<void> => {
  const { employer } = await resolveEmployerContext(req, res);
  const rows = await db
    .select({
      id: employeesTable.id,
      externalEmployeeId: employeesTable.externalEmployeeId,
      name: employeesTable.name,
      workEmail: employeesTable.workEmail,
      department: employeesTable.department,
      benefitTier: employeesTable.benefitTier,
      eligibilityStatus: employeesTable.eligibilityStatus,
      householdEligible: employeesTable.householdEligible,
    })
    .from(employeesTable)
    .where(eq(employeesTable.employerId, employer.id))
    .orderBy(employeesTable.name);
  const fallback = [
    {
      id: 1,
      externalEmployeeId: "MEG-0001",
      name: "Omar Mansour",
      workEmail: "o.mansour@meridian.edu",
      department: "Academic",
      benefitTier: "Faculty",
      eligibilityStatus: "eligible",
      householdEligible: true,
    },
    {
      id: 2,
      externalEmployeeId: "MEG-0002",
      name: "Dr. Sarah Al-Hassan",
      workEmail: "s.al-hassan@meridian.edu",
      department: "Academic",
      benefitTier: "Faculty",
      eligibilityStatus: "eligible",
      householdEligible: true,
    },
    {
      id: 3,
      externalEmployeeId: "MEG-0003",
      name: "Rania Khalil",
      workEmail: "r.khalil@meridian.edu",
      department: "HR & Administration",
      benefitTier: "Staff",
      eligibilityStatus: "eligible",
      householdEligible: true,
    },
    {
      id: 4,
      externalEmployeeId: "MEG-0004",
      name: "Tom Mackenzie",
      workEmail: "t.mackenzie@meridian.edu",
      department: "IT & Operations",
      benefitTier: "Staff",
      eligibilityStatus: "eligible",
      householdEligible: false,
    },
    {
      id: 5,
      externalEmployeeId: "MEG-0005",
      name: "Aisha Bakr",
      workEmail: "a.bakr@meridian.edu",
      department: "Student Services",
      benefitTier: "Administrative",
      eligibilityStatus: "eligible",
      householdEligible: false,
    },
  ];
  res.json(ListEmployerEmployeesResponse.parse(rows.length ? rows : fallback));
});

router.get("/v1/employer/campus-breakdown", requireEmployerRole, async (req, res): Promise<void> => {
  const { employer, institutionId } = await resolveEmployerContext(req, res);
  if (!institutionId) { res.status(500).json({ error: "No institution linked to this employer" }); return; }
  // Only return campuses that belong to the employer's institution (tenant isolation)
  const campuses = await db.select().from(campusesTable).where(eq(campusesTable.institutionId, institutionId));
  const allEmployees = await db.select({ id: employeesTable.id, campusId: employeesTable.campusId, linkedMemberId: employeesTable.linkedMemberId }).from(employeesTable).where(eq(employeesTable.employerId, employer.id));

  const result = await Promise.all(campuses.map(async (campus) => {
    const campusEmployees = allEmployees.filter(e => e.campusId === campus.id);
    const PRIVACY_THRESHOLD = 5;
    const privacyGuarded = campusEmployees.length > 0 && campusEmployees.length < PRIVACY_THRESHOLD;

    let totalAuthorized = 0, totalRedeemed = 0, totalReserved = 0;
    if (!privacyGuarded && campusEmployees.length > 0) {
      const empIds = campusEmployees.map(e => e.id);
      const ledger = await db.select().from(allowanceLedgerTable).where(inArray(allowanceLedgerTable.employeeId, empIds));
      totalAuthorized = ledger.filter(l => l.entryType === "authorized").reduce((s, l) => s + l.amount, 0);
      totalRedeemed = ledger.filter(l => l.entryType === "redeemed").reduce((s, l) => s + l.amount, 0);
      totalReserved = ledger.filter(l => l.entryType === "reserved").reduce((s, l) => s + l.amount, 0);
    }

    return {
      campusId: campus.id,
      campusName: campus.name,
      employeeCount: campusEmployees.length,
      activeEmployees: campusEmployees.filter(e => e.linkedMemberId !== null).length,
      totalAuthorized,
      totalRedeemed,
      totalReserved,
      privacyGuarded,
    };
  }));

  res.json(result);
});

router.patch("/v1/employer/employees/:id", requireEmployerRole, async (req, res): Promise<void> => {
  const id = parseInt(String(req.params["id"] ?? "0"), 10);
  // IDOR protection: verify the employee belongs to the authenticated employer
  const { employer } = await resolveEmployerContext(req, res);
  const [owned] = await db.select({ id: employeesTable.id }).from(employeesTable)
    .where(and(eq(employeesTable.id, id), eq(employeesTable.employerId, employer.id)));
  if (!owned) { res.status(404).json({ error: "Employee not found" }); return; }

  const { eligibilityStatus, benefitTier, tierId, campusId, department, householdEligible, startDate, endDate } = req.body as {
    eligibilityStatus?: string; benefitTier?: string; tierId?: number; campusId?: number;
    department?: string; householdEligible?: boolean; startDate?: string; endDate?: string;
  };

  const updates: Record<string, unknown> = {};
  if (eligibilityStatus !== undefined) updates.eligibilityStatus = eligibilityStatus;
  if (benefitTier !== undefined) updates.benefitTier = benefitTier;
  if (tierId !== undefined) updates.tierId = tierId;
  if (campusId !== undefined) updates.campusId = campusId;
  if (department !== undefined) updates.department = department;
  if (householdEligible !== undefined) updates.householdEligible = householdEligible;
  if (startDate !== undefined) updates.startDate = startDate;
  if (endDate !== undefined) updates.endDate = endDate;

  const [updated] = await db.update(employeesTable).set(updates).where(eq(employeesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ error: "Employee not found" }); return; }

  // Fetch campus and tier names for the response
  const [campus] = updated.campusId
    ? await db.select({ name: campusesTable.name }).from(campusesTable).where(eq(campusesTable.id, updated.campusId))
    : [];
  const [tier] = updated.tierId
    ? await db.select({ name: benefitTiersTable.name }).from(benefitTiersTable).where(eq(benefitTiersTable.id, updated.tierId))
    : [];

  res.json({
    id: updated.id,
    externalEmployeeId: updated.externalEmployeeId,
    name: updated.name,
    workEmail: updated.workEmail,
    department: updated.department,
    benefitTier: updated.benefitTier,
    eligibilityStatus: updated.eligibilityStatus,
    householdEligible: updated.householdEligible,
    campusId: updated.campusId ?? undefined,
    campusName: campus?.name,
    tierId: updated.tierId ?? undefined,
    tierName: tier?.name,
    startDate: updated.startDate ?? undefined,
    endDate: updated.endDate ?? undefined,
  });
});

router.post("/v1/employer/employees/add", requireEmployerRole, async (req, res): Promise<void> => {
  const { name, workEmail, department, benefitTier, externalEmployeeId, campusId, tierId, householdEligible = true } = req.body as {
    name: string; workEmail: string; department: string; benefitTier: string;
    externalEmployeeId?: string; campusId?: number; tierId?: number; householdEligible?: boolean;
  };
  if (!name || !workEmail || !department || !benefitTier) {
    res.status(400).json({ error: "name, workEmail, department, and benefitTier are required" });
    return;
  }

  const { employer, institutionId: contextInstitutionId } = await resolveEmployerContext(req, res);

  const extId = externalEmployeeId ?? `EMP-${Date.now()}`;
  const today = new Date().toISOString().split("T")[0]!;

  const [employee] = await db.insert(employeesTable).values({
    employerId: employer.id,
    externalEmployeeId: extId,
    name,
    workEmail,
    department,
    benefitTier,
    eligibilityStatus: "eligible",
    householdEligible,
    startDate: today,
    campusId: campusId ?? null,
    tierId: tierId ?? null,
    institutionId: contextInstitutionId,
  }).returning();

  const [campus] = campusId
    ? await db.select({ name: campusesTable.name }).from(campusesTable).where(eq(campusesTable.id, campusId))
    : [];
  const [tier] = tierId
    ? await db.select({ name: benefitTiersTable.name }).from(benefitTiersTable).where(eq(benefitTiersTable.id, tierId))
    : [];

  res.status(201).json({
    id: employee!.id,
    externalEmployeeId: employee!.externalEmployeeId,
    name: employee!.name,
    workEmail: employee!.workEmail,
    department: employee!.department,
    benefitTier: employee!.benefitTier,
    eligibilityStatus: employee!.eligibilityStatus,
    householdEligible: employee!.householdEligible,
    campusId: employee!.campusId ?? undefined,
    campusName: campus?.name,
    tierId: employee!.tierId ?? undefined,
    tierName: tier?.name,
  });
});

router.get("/v1/employer/benefit-plans", requireEmployerRole, async (req, res): Promise<void> => {
  const { institutionId } = await resolveEmployerContext(req, res);
  if (!institutionId) { res.json([]); return; }
  // Scope to this employer's institution (tenant isolation)
  const plans = await db.select().from(benefitPlansTable).where(eq(benefitPlansTable.institutionId, institutionId));
  const planIds = plans.map(p => p.id);
  const tiers = planIds.length > 0 ? await db.select().from(benefitTiersTable).where(inArray(benefitTiersTable.planId, planIds)) : [];
  const employees = await db.select({ id: employeesTable.id, tierId: employeesTable.tierId }).from(employeesTable).where(eq(employeesTable.institutionId, institutionId));

  const tierEmpCount = new Map<number, number>();
  for (const emp of employees) {
    if (emp.tierId) tierEmpCount.set(emp.tierId, (tierEmpCount.get(emp.tierId) ?? 0) + 1);
  }

  const result = plans.map(plan => {
    const planTiers = tiers.filter(t => t.planId === plan.id);
    const totalEmployees = planTiers.reduce((s, t) => s + (tierEmpCount.get(t.id) ?? 0), 0);
    const monthlyLiability = planTiers.reduce((s, t) => {
      const empCount = tierEmpCount.get(t.id) ?? 0;
      return s + empCount * t.monthlyAllowance;
    }, 0);

    return {
      id: plan.id,
      name: plan.name,
      period: plan.period,
      renewalFrequency: plan.renewalFrequency,
      expirationPolicy: plan.expirationPolicy,
      rolloverEnabled: plan.rolloverEnabled,
      householdAccess: plan.householdAccess,
      topUpPermitted: plan.topUpPermitted,
      active: plan.active,
      employeeCount: totalEmployees,
      monthlyLiability,
      tiers: planTiers.map(t => ({
        id: t.id,
        name: t.name,
        monthlyAllowance: t.monthlyAllowance,
        description: t.description,
        active: t.active,
        employeeCount: tierEmpCount.get(t.id) ?? 0,
      })),
    };
  });

  res.json(result);
});

router.post("/v1/employer/benefit-plans", requireEmployerRole, async (req, res): Promise<void> => {
  const { name, period = "monthly", renewalFrequency = "monthly", expirationPolicy = "expires_at_period_end", rolloverEnabled = false, householdAccess = true, topUpPermitted = true, tiers = [] } = req.body as {
    name: string; period?: string; renewalFrequency?: string; expirationPolicy?: string;
    rolloverEnabled?: boolean; householdAccess?: boolean; topUpPermitted?: boolean;
    tiers?: Array<{ name: string; monthlyAllowance: number; description: string }>;
  };
  if (!name) { res.status(400).json({ error: "name is required" }); return; }

  // Derive institution from the authenticated employer context (tenant isolation)
  const { institutionId: ctxInstitutionId } = await resolveEmployerContext(req, res);
  if (!ctxInstitutionId) { res.status(500).json({ error: "No institution linked to this employer" }); return; }

  const [plan] = await db.insert(benefitPlansTable).values({
    institutionId: ctxInstitutionId,
    name,
    period,
    renewalFrequency,
    expirationPolicy,
    rolloverEnabled,
    householdAccess,
    topUpPermitted,
    permittedCategoryIds: [],
    active: true,
  }).returning();

  const insertedTiers = tiers.length > 0
    ? await db.insert(benefitTiersTable).values(tiers.map(t => ({
        planId: plan!.id,
        name: t.name,
        monthlyAllowance: t.monthlyAllowance,
        description: t.description,
        active: true,
      }))).returning()
    : [];

  const monthlyLiability = 0; // new plan has no employees yet
  res.status(201).json({
    id: plan!.id,
    name: plan!.name,
    period: plan!.period,
    renewalFrequency: plan!.renewalFrequency,
    expirationPolicy: plan!.expirationPolicy,
    rolloverEnabled: plan!.rolloverEnabled,
    householdAccess: plan!.householdAccess,
    topUpPermitted: plan!.topUpPermitted,
    active: plan!.active,
    employeeCount: 0,
    monthlyLiability,
    tiers: insertedTiers.map(t => ({
      id: t.id,
      name: t.name,
      monthlyAllowance: t.monthlyAllowance,
      description: t.description,
      active: t.active,
      employeeCount: 0,
    })),
  });
});

router.post("/v1/demo/reset", async (req, res): Promise<void> => {
  if (process.env.NODE_ENV !== "development") {
    res.status(403).json({ error: "Demo reset is only available in development." });
    return;
  }
  // Re-runs the seed script to restore pristine demo state
  const { exec } = await import("child_process");
  exec("pnpm --filter @workspace/scripts run seed", (error) => {
    if (error) {
      res.status(500).json({ error: "Seed failed. Check server logs." });
    } else {
      res.json({ status: "ok", message: "Demo data reset to Meridian Education Group seed." });
    }
  });
});

router.post("/v1/employer/employees", requireEmployerRole, async (req, res): Promise<void> => {
  const parsed = ImportEmployerEmployeesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const lines = parsed.data.csv.trim().split(/\r?\n/);
  const imported = Math.max(0, lines.length - 1);
  req.log.info({ imported }, "Simulated employer roster import");
  res.json(
    ImportEmployerEmployeesResponse.parse({
      status: "simulated",
      imported,
      skipped: 0,
      message: `${imported} roster rows validated. No HRIS connection was used in this demo.`,
    }),
  );
});

router.get("/v1/employer/utilization", requireEmployerRole, async (req, res): Promise<void> => {
  const bookings = await fetchBookingViews();
  const completed = bookings.filter((booking) => booking.status === "completed");
  const catMap: Record<string, string> = {
    "Household & Life Admin": "Household & Life Admin",
    "Personal Wellbeing": "Personal Wellbeing",
    "Fitness & Recovery": "Fitness & Recovery",
    "Mobility & Convenience": "Mobility & Convenience",
    "Family & Dependent Support": "Family & Dependent Support",
    "Personal Development": "Personal Development",
    "Recreation & Lifestyle": "Recreation & Lifestyle",
    // backward compat with old category names
    "Home Cleaning": "Household & Life Admin",
    "Laundry & Pressing": "Household & Life Admin",
    "AC & Cooling": "Household & Life Admin",
    "Handyman": "Household & Life Admin",
    "Beauty at Home": "Personal Wellbeing",
    "Health at Home": "Personal Wellbeing",
  };
  const byCategory = new Map<string, number>();
  for (const booking of bookings) {
    const category = catMap[booking.categoryName] ?? null;
    if (category) byCategory.set(category, (byCategory.get(category) ?? 0) + 1);
  }
  const total = [...byCategory.values()].reduce((sum, count) => sum + count, 0) || 1;
  res.json(
    GetEmployerUtilizationResponse.parse({
      activationRate: 75.2,
      redemptionRate: 52.3,
      repeatUsageRate: 61.4,
      averageSupportPerActiveEmployee: 182.4,
      categoryUtilization: (byCategory.size
        ? [...byCategory.entries()]
        : [
            ["Household & Life Admin", 42],
            ["Personal Wellbeing", 28],
            ["Fitness & Recovery", 18],
            ["Family & Dependent Support", 12],
          ]
      ).map(([category, count]) => ({
        category,
        bookings: count,
        share: Math.round((Number(count) / total) * 1000) / 10,
      })),
      corporateSavings: 4320,
      estimatedTimeSavedMinutes: completed.length * 90 || 9840,
      satisfaction: 4.9,
      completionRate: 97.1,
      serviceRecoveryRate: 98.8,
    }),
  );
});

router.get("/v1/employer/integrations", requireEmployerRole, async (req, res): Promise<void> => {
  const { employer } = await resolveEmployerContext(req, res);
  res.json(
    GetEmployerIntegrationsResponse.parse({
      ssoLabel: "Simulated SSO launch",
      ssoUrl: "/?role=employee&source=meridian-demo",
      widgetScript: "/embed/loup-widget.js",
      widgetSnippet:
        `<!-- Loup employee benefits widget (${employer.name}) -->\n` +
        '<script src="/embed/loup-widget.js"></script>',
      apiMode: "Headless API access is simulated in this MVP.",
    }),
  );
});

router.get("/v1/vendor/today", async (req, res): Promise<void> => {
  const bookings = await fetchBookingViews({
    statuses: ["pending", "confirmed", "en_route", "arrived", "in_progress"],
  });
  const assignedBookings = bookings.slice(0, 4).map((booking) => ({
    id: booking.id,
    category:
      booking.categoryName === "AC & Cooling" ||
      booking.categoryName === "Handyman"
        ? "Home Maintenance"
        : booking.categoryName,
    zone: "Dubai Hills",
    scheduledAt: asDate(booking.scheduledAt),
    status: booking.status,
    operationalRequirement:
      booking.instructions ?? "Standard service brief available after acceptance.",
  }));
  res.json(
    GetVendorTodayResponse.parse({
      vendorName: "Marina Shine Cleaning",
      assignedBookings,
      awaitingAcceptance: 2,
      availableCapacity: 6,
      capacityWarnings: 1,
      lateArrivalWarnings: 1,
      serviceRecoveryActions: 1,
    }),
  );
});

router.get("/v1/vendor/forecast", (_req, res): void => {
  res.json(
    GetVendorForecastResponse.parse({
      updatedAt: new Date(),
      confidence: 0.86,
      windows: [
        {
          label: "Next 7 days",
          category: "Home Cleaning",
          zone: "Dubai Hills",
          expectedBookings: 18,
          low: 14,
          high: 23,
          capacityGap: 3,
          recommendation: "Commit one additional Saturday crew.",
        },
        {
          label: "Next 30 days",
          category: "Laundry & Pressing",
          zone: "Dubai Hills",
          expectedBookings: 42,
          low: 34,
          high: 51,
          capacityGap: -4,
          recommendation: "Current declared capacity covers the estimate.",
        },
        {
          label: "Renewal period",
          category: "Home Maintenance",
          zone: "Dubai Hills",
          expectedBookings: 27,
          low: 20,
          high: 36,
          capacityGap: 6,
          recommendation: "Hold backup technician capacity for month end.",
        },
      ],
    }),
  );
});

router.get("/v1/vendor/performance", (_req, res): void => {
  res.json(
    GetVendorPerformanceResponse.parse({
      vendorName: "Marina Shine Cleaning",
      status: "Active",
      completionRate: 97.1,
      onTimeRate: 94.2,
      cancellationRate: 1.8,
      averageRating: 4.8,
      complaintRate: 0.9,
      serviceRecoveryRate: 98.7,
      capacityAccuracy: 91.4,
    }),
  );
});

router.get("/v1/operations/overview", async (req, res): Promise<void> => {
  const bookings = await fetchBookingViews();
  const matching = bookings.slice(0, 3).map((booking, index) => ({
    bookingId: booking.id,
    category:
      booking.categoryName === "AC & Cooling" ||
      booking.categoryName === "Handyman"
        ? "Home Maintenance"
        : booking.categoryName,
    zone: "Dubai Hills",
    selectedProvider: booking.providerName,
    score: 92 - index * 4,
    drivers: ["Service capability", "Zone coverage", "On-time history"],
    manualOverride: index === 2,
  }));
  res.json(
    GetOperationsOverviewResponse.parse({
      forecastBookings: 87,
      confirmedBookings: bookings.filter((b) => b.status === "confirmed").length,
      unfulfilledDemand: 4,
      capacityShortages: 1,
      highRiskBookings: 1,
      providerIncidents: 2,
      transactionVolume: 18240,
      spendingAlerts: 1,
      matching,
      methodology:
        "Simulated MVP estimate using recent booking events, category, general zone, capacity commitments and benefit-cycle timing. No precise addresses or employee predictions are used.",
    }),
  );
});

router.get("/v1/operations/service-fit", (_req, res): void => {
  res.json(
    ListServiceFitEvaluationsResponse.parse([
      {
        service: "Home Cleaning",
        status: "Active",
        dimensions: ["Time wellbeing", "Home wellbeing"],
        problemFrequency: 5,
        timeSaved: 5,
        employerRelevance: 5,
        repeatPotential: 5,
        standardization: 5,
        providerCoverage: 5,
        regulatoryComplexity: 1,
        overallFit: 29,
      },
      {
        service: "Laundry & Pressing",
        status: "Active",
        dimensions: ["Time wellbeing", "Home wellbeing"],
        problemFrequency: 4,
        timeSaved: 4,
        employerRelevance: 4,
        repeatPotential: 5,
        standardization: 5,
        providerCoverage: 4,
        regulatoryComplexity: 1,
        overallFit: 25,
      },
      {
        service: "Home Maintenance",
        status: "Active",
        dimensions: ["Home wellbeing", "Financial wellbeing"],
        problemFrequency: 4,
        timeSaved: 5,
        employerRelevance: 4,
        repeatPotential: 3,
        standardization: 4,
        providerCoverage: 4,
        regulatoryComplexity: 2,
        overallFit: 22,
      },
      {
        service: "Home organisation support",
        status: "Future",
        dimensions: ["Time wellbeing", "Home wellbeing"],
        problemFrequency: 3,
        timeSaved: 4,
        employerRelevance: 3,
        repeatPotential: 3,
        standardization: 2,
        providerCoverage: 2,
        regulatoryComplexity: 1,
        overallFit: 16,
      },
    ]),
  );
});

// ── CSV helpers ───────────────────────────────────────────────────────────────

/**
 * Sanitize and quote a single CSV cell value.
 * Cells whose text begins with a spreadsheet formula character (=, +, -, @, tab, CR)
 * are prefixed with a tab to neutralize formula injection when opened in Excel/Sheets.
 */
function csvCell(v: unknown): string {
  const raw = v == null ? "" : String(v);
  // Neutralize formula injection: prefix dangerous lead characters with a tab
  const s = /^[=+\-@\t\r]/.test(raw) ? `\t${raw}` : raw;
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\t")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]!);
  const lines = [headers.map(csvCell).join(",")];
  for (const row of rows) lines.push(headers.map(h => csvCell(row[h])).join(","));
  return lines.join("\r\n");
}

function sendCSV(res: Response, filename: string, csv: string): void {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send(csv);
}

/**
 * Compute the net allowance position for one employee from their raw ledger entries.
 *
 * Accounting model:
 *   authorized  = total budget granted for the period
 *   redeemed    = confirmed spend (completed bookings)
 *   active_held = reservations not yet fulfilled or released
 *               = max(0, sum(reserved) − sum(released) − sum(redeemed))
 *   remaining   = authorized − redeemed − active_held
 *
 * This avoids double-counting when a reservation is later converted to a
 * redemption without an explicit "released" entry: the redeemed amount is
 * subtracted from the gross reserved total before computing the active hold.
 */
function computeEmployeeAllowance(
  ledger: { entryType: string; amount: number }[],
  fallbackAuthorized: number,
): { authorized: number; redeemed: number; activeHeld: number; remaining: number } {
  const authorized  = ledger.filter(l => l.entryType === "authorized").reduce((s, l) => s + l.amount, 0) || fallbackAuthorized;
  const redeemed    = ledger.filter(l => l.entryType === "redeemed").reduce((s, l) => s + l.amount, 0);
  const sumReserved = ledger.filter(l => l.entryType === "reserved").reduce((s, l) => s + l.amount, 0);
  const sumReleased = ledger.filter(l => l.entryType === "released").reduce((s, l) => s + l.amount, 0);
  const activeHeld  = Math.max(0, sumReserved - sumReleased - redeemed);
  const remaining   = Math.max(0, authorized - redeemed - activeHeld);
  return { authorized, redeemed, activeHeld, remaining };
}

// ── Employer CSV exports ───────────────────────────────────────────────────────

// Export 1: Employee eligibility roster
router.get("/v1/employer/export/roster", requireEmployerRole, async (req, res): Promise<void> => {
  const { employer } = await resolveEmployerContext(req, res);

  const rows = await db
    .select({
      id:               employeesTable.id,
      name:             employeesTable.name,
      workEmail:        employeesTable.workEmail,
      department:       employeesTable.department,
      campusId:         employeesTable.campusId,
      benefitTier:      employeesTable.benefitTier,
      tierId:           employeesTable.tierId,
      eligibilityStatus: employeesTable.eligibilityStatus,
      startDate:        employeesTable.startDate,
      endDate:          employeesTable.endDate,
    })
    .from(employeesTable)
    .where(eq(employeesTable.employerId, employer.id))
    .orderBy(employeesTable.name);

  if (!rows.length) {
    sendCSV(res, "meridian-employee-roster.csv",
      "Name,Email,Department,Campus,Benefit Tier,Eligibility,Monthly Allowance (AED),Benefit Start Date,Benefit End Date\r\n");
    return;
  }

  const campusIds = [...new Set(rows.map(r => r.campusId).filter(Boolean) as number[])];
  const tierIds   = [...new Set(rows.map(r => r.tierId).filter(Boolean) as number[])];
  const empIds    = rows.map(r => r.id);

  const [campusRows, tierRows, ledgerRows] = await Promise.all([
    campusIds.length > 0
      ? db.select({ id: campusesTable.id, name: campusesTable.name })
          .from(campusesTable).where(inArray(campusesTable.id, campusIds))
      : Promise.resolve<{ id: number; name: string }[]>([]),
    tierIds.length > 0
      ? db.select({ id: benefitTiersTable.id, monthlyAllowance: benefitTiersTable.monthlyAllowance })
          .from(benefitTiersTable).where(inArray(benefitTiersTable.id, tierIds))
      : Promise.resolve<{ id: number; monthlyAllowance: number }[]>([]),
    db.select({
        employeeId: allowanceLedgerTable.employeeId,
        entryType:  allowanceLedgerTable.entryType,
        amount:     allowanceLedgerTable.amount,
      })
      .from(allowanceLedgerTable)
      .where(inArray(allowanceLedgerTable.employeeId, empIds)),
  ]);

  const campusMap = new Map(campusRows.map(c => [c.id, c.name]));
  const tierMap   = new Map(tierRows.map(t => [t.id, t.monthlyAllowance]));

  const csvRows = rows.map(emp => {
    const tierAllowance = emp.tierId ? (tierMap.get(emp.tierId) ?? 750) : 750;
    const empLedger = ledgerRows.filter(l => l.employeeId === emp.id);
    const { authorized } = computeEmployeeAllowance(empLedger, tierAllowance);
    return {
      "Name":                    emp.name,
      "Email":                   emp.workEmail,
      "Department":              emp.department,
      "Campus":                  emp.campusId ? (campusMap.get(emp.campusId) ?? "") : "",
      "Benefit Tier":            emp.benefitTier,
      "Eligibility":             emp.eligibilityStatus,
      "Monthly Allowance (AED)": authorized,
      "Benefit Start Date":      emp.startDate ?? "",
      "Benefit End Date":        emp.endDate ?? "",
    };
  });

  sendCSV(res, "meridian-employee-roster.csv", toCSV(csvRows));
});

// Export 2: Campus utilization breakdown
router.get("/v1/employer/export/utilization", requireEmployerRole, async (req, res): Promise<void> => {
  const { employer, institutionId } = await resolveEmployerContext(req, res);
  if (!institutionId) { res.status(500).json({ error: "No institution linked to this employer" }); return; }

  const campuses    = await db.select().from(campusesTable).where(eq(campusesTable.institutionId, institutionId));
  const allEmployees = await db
    .select({ id: employeesTable.id, campusId: employeesTable.campusId, tierId: employeesTable.tierId })
    .from(employeesTable).where(eq(employeesTable.employerId, employer.id));

  // Load tier allowances once
  const tierIds = [...new Set(allEmployees.map(e => e.tierId).filter(Boolean) as number[])];
  const tierRows = tierIds.length > 0
    ? await db.select({ id: benefitTiersTable.id, monthlyAllowance: benefitTiersTable.monthlyAllowance })
        .from(benefitTiersTable).where(inArray(benefitTiersTable.id, tierIds))
    : [];
  const tierMap = new Map(tierRows.map(t => [t.id, t.monthlyAllowance]));

  const allEmpIds = allEmployees.map(e => e.id);
  const allLedger = allEmpIds.length > 0
    ? await db.select({
        employeeId: allowanceLedgerTable.employeeId,
        entryType:  allowanceLedgerTable.entryType,
        amount:     allowanceLedgerTable.amount,
      }).from(allowanceLedgerTable).where(inArray(allowanceLedgerTable.employeeId, allEmpIds))
    : [];

  const csvRows: Record<string, unknown>[] = [];
  const PRIVACY_THRESHOLD = 5;

  for (const campus of campuses) {
    const campusEmp = allEmployees.filter(e => e.campusId === campus.id);
    if (campusEmp.length === 0) continue;

    if (campusEmp.length < PRIVACY_THRESHOLD) {
      csvRows.push({
        "Campus": campus.name, "Employee Count": campusEmp.length,
        "Authorized (AED)": "suppressed", "Active Holds (AED)": "suppressed",
        "Redeemed (AED)": "suppressed", "Remaining (AED)": "suppressed",
        "Note": "Group too small — data suppressed for privacy",
      });
      continue;
    }

    let totAuthorized = 0, totRedeemed = 0, totActiveHeld = 0, totRemaining = 0;
    for (const emp of campusEmp) {
      const fallback = emp.tierId ? (tierMap.get(emp.tierId) ?? 750) : 750;
      const empLedger = allLedger.filter(l => l.employeeId === emp.id);
      const result = computeEmployeeAllowance(empLedger, fallback);
      totAuthorized += result.authorized;
      totRedeemed   += result.redeemed;
      totActiveHeld += result.activeHeld;
      totRemaining  += result.remaining;
    }

    csvRows.push({
      "Campus":             campus.name,
      "Employee Count":     campusEmp.length,
      "Authorized (AED)":  totAuthorized,
      "Active Holds (AED)": totActiveHeld,
      "Redeemed (AED)":    totRedeemed,
      "Remaining (AED)":   totRemaining,
      "Note":              "",
    });
  }

  sendCSV(res, "meridian-utilization.csv", toCSV(csvRows));
});

// Export 3: Per-employee billing ledger (current benefit cycle)
router.get("/v1/employer/export/billing", requireEmployerRole, async (req, res): Promise<void> => {
  const { employer } = await resolveEmployerContext(req, res);

  const empRows = await db
    .select({
      id:          employeesTable.id,
      name:        employeesTable.name,
      workEmail:   employeesTable.workEmail,
      benefitTier: employeesTable.benefitTier,
      tierId:      employeesTable.tierId,
    })
    .from(employeesTable)
    .where(eq(employeesTable.employerId, employer.id))
    .orderBy(employeesTable.benefitTier, employeesTable.name);

  if (!empRows.length) {
    sendCSV(res, "meridian-billing-ledger.csv",
      "Cycle,Employee Name,Email,Tier,Authorized (AED),Active Holds (AED),Redeemed (AED),Remaining (AED)\r\n");
    return;
  }

  const empIds = empRows.map(e => e.id);

  // Load tier allowances
  const tierIds = [...new Set(empRows.map(e => e.tierId).filter(Boolean) as number[])];
  const [tierRows, allLedger] = await Promise.all([
    tierIds.length > 0
      ? db.select({ id: benefitTiersTable.id, monthlyAllowance: benefitTiersTable.monthlyAllowance })
          .from(benefitTiersTable).where(inArray(benefitTiersTable.id, tierIds))
      : Promise.resolve<{ id: number; monthlyAllowance: number }[]>([]),
    db.select({
        employeeId:  allowanceLedgerTable.employeeId,
        entryType:   allowanceLedgerTable.entryType,
        amount:      allowanceLedgerTable.amount,
        createdAt:   allowanceLedgerTable.createdAt,
      })
      .from(allowanceLedgerTable)
      .where(inArray(allowanceLedgerTable.employeeId, empIds))
      .orderBy(allowanceLedgerTable.createdAt),
  ]);
  const tierMap = new Map(tierRows.map(t => [t.id, t.monthlyAllowance]));

  // Determine cycles: derive from ledger createdAt, fall back to current month
  const cycleOf = (d: Date) => d.toISOString().slice(0, 7);
  const cycleSet = new Set(allLedger.map(l => cycleOf(l.createdAt)));
  const cycles   = cycleSet.size > 0 ? [...cycleSet].sort() : [new Date().toISOString().slice(0, 7)];

  const csvRows: Record<string, unknown>[] = [];

  for (const cycle of cycles) {
    // Ledger entries for this calendar month
    const cycleLedger = allLedger.filter(l => cycleOf(l.createdAt) === cycle);
    // All entries up to and including this month for running totals (authorized persists across months)
    const cumulativeLedger = allLedger.filter(l => cycleOf(l.createdAt) <= cycle);

    const tierTotals: Record<string, { authorized: number; activeHeld: number; redeemed: number; remaining: number }> = {};

    for (const emp of empRows) {
      const fallback = emp.tierId ? (tierMap.get(emp.tierId) ?? 750) : 750;
      // Use cumulative ledger so authorized entries from earlier months still count
      const empLedger = cumulativeLedger.filter(l => l.employeeId === emp.id);
      // Redeemed/reserved: only within this cycle for billing breakdown
      const empCycle  = cycleLedger.filter(l => l.employeeId === emp.id);
      const authorizedEntry = empLedger.filter(l => l.entryType === "authorized");
      const authorized = authorizedEntry.reduce((s, l) => s + l.amount, 0) || fallback;
      const { redeemed, activeHeld, remaining } = computeEmployeeAllowance(
        // Compute activity from cumulative ledger (correct net position)
        empLedger,
        fallback,
      );

      // Suppress zero-activity rows if this is not the only cycle and employee has no ledger this cycle
      const hasActivityThisCycle = empCycle.some(l => l.entryType !== "authorized");
      if (cycles.length > 1 && !hasActivityThisCycle && redeemed === 0 && activeHeld === 0) continue;

      csvRows.push({
        "Cycle":              cycle,
        "Employee Name":      emp.name,
        "Email":              emp.workEmail,
        "Tier":               emp.benefitTier,
        "Authorized (AED)":   authorized,
        "Active Holds (AED)": activeHeld,
        "Redeemed (AED)":     redeemed,
        "Remaining (AED)":    remaining,
      });

      if (!tierTotals[emp.benefitTier]) tierTotals[emp.benefitTier] = { authorized: 0, activeHeld: 0, redeemed: 0, remaining: 0 };
      const t = tierTotals[emp.benefitTier]!;
      t.authorized += authorized;
      t.activeHeld += activeHeld;
      t.redeemed   += redeemed;
      t.remaining  += remaining;
    }

    // Subtotal row per tier
    for (const [tier, totals] of Object.entries(tierTotals)) {
      csvRows.push({
        "Cycle":              cycle,
        "Employee Name":      `SUBTOTAL — ${tier}`,
        "Email":              "",
        "Tier":               tier,
        "Authorized (AED)":   totals.authorized,
        "Active Holds (AED)": totals.activeHeld,
        "Redeemed (AED)":     totals.redeemed,
        "Remaining (AED)":    totals.remaining,
      });
    }
  }

  sendCSV(res, "meridian-billing-ledger.csv", toCSV(csvRows));
});

router.get("/v1/operations/audit", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      id: auditEventsTable.id,
      actorRole: auditEventsTable.actorRole,
      action: auditEventsTable.action,
      entityType: auditEventsTable.entityType,
      entityId: auditEventsTable.entityId,
      createdAt: auditEventsTable.createdAt,
    })
    .from(auditEventsTable)
    .orderBy(desc(auditEventsTable.createdAt))
    .limit(12);
  const fallback = [
    {
      id: 1,
      actorRole: "operations",
      action: "matching.override",
      entityType: "booking",
      entityId: "16",
      createdAt: new Date(),
    },
    {
      id: 2,
      actorRole: "employer",
      action: "benefit_programme.updated",
      entityType: "benefit_programme",
      entityId: "1",
      createdAt: new Date(Date.now() - 3600_000),
    },
    {
      id: 3,
      actorRole: "employee",
      action: "allowance.reserved",
      entityType: "ledger",
      entityId: "1",
      createdAt: new Date(Date.now() - 7200_000),
    },
  ];
  res.json(ListAuditEventsResponse.parse(rows.length ? rows : fallback));
});

export default router;