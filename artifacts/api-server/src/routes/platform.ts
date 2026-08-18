import { desc, eq, and, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
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
  supportIncidentsTable,
  servicesTable,
  providersTable,
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
  ListEmployerEmployeesResponse,
  ListServiceFitEvaluationsResponse,
} from "@workspace/api-zod";
import { fetchBookingViews, getCurrentMember } from "../lib/loup";

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
    description: "Manage the Meridian campus benefit programme, monitor adoption, and configure employee tiers.",
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

  const [employer] = await db
    .select()
    .from(employersTable)
    .where(eq(employersTable.slug, "meridian"));

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
  let availableAllowance = 416; // fallback
  if (employeeRow) {
    const ledger = await db.select().from(allowanceLedgerTable).where(eq(allowanceLedgerTable.employeeId, employeeRow.id));
    const auth = ledger.filter(r => r.entryType === "authorized").reduce((s, r) => s + r.amount, 0) || 750;
    const res_ = ledger.filter(r => r.entryType === "reserved").reduce((s, r) => s + r.amount, 0);
    const red = ledger.filter(r => r.entryType === "redeemed").reduce((s, r) => s + r.amount, 0);
    availableAllowance = Math.max(0, auth - res_ - red);
  }

  const publicPrice = service.price;
  const institutionalPrice = Math.round(publicPrice * 0.9 * 100) / 100; // 10% institutional discount
  const institutionalSaving = Math.round((publicPrice - institutionalPrice) * 100) / 100;
  const employerContribution = Math.min(availableAllowance, institutionalPrice);
  const employeeCopayment = Math.max(0, Math.round((institutionalPrice - employerContribution) * 100) / 100);

  res.json(GetCheckoutPreviewResponse.parse({
    serviceId: service.id,
    serviceName: service.name,
    providerName: provider?.name ?? "Provider",
    publicPrice,
    institutionalPrice,
    institutionalSaving,
    availableAllowance,
    employerContribution,
    employeeCopayment,
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

router.get("/v1/employer/overview", async (_req, res): Promise<void> => {
  const employees = await db.select().from(employeesTable);
  const bookings = await fetchBookingViews();
  const completed = bookings.filter((booking) => booking.status === "completed");
  res.json(
    GetEmployerOverviewResponse.parse({
      employerName: "Meridian Education Group",
      eligibleEmployees: employees.length || 218,
      activatedEmployees: employees.length ? Math.min(164, employees.length) : 164,
      authorizedMaximum: 124500,
      redeemedAllowances: completed.length ? 18340 : 11200,
      reservedAllowances: 3840,
      forecastRedemptions: 24800,
      invoiceEstimate: 21060,
      completionRate: 97.1,
      satisfaction: 4.9,
    }),
  );
});

router.get("/v1/employer/employees", async (_req, res): Promise<void> => {
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

router.post("/v1/demo/reset", async (_req, res): Promise<void> => {
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

router.post("/v1/employer/employees", async (req, res): Promise<void> => {
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

router.get("/v1/employer/utilization", async (_req, res): Promise<void> => {
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

router.get("/v1/employer/integrations", (_req, res): void => {
  res.json(
    GetEmployerIntegrationsResponse.parse({
      ssoLabel: "Simulated SSO launch",
      ssoUrl: "/?role=employee&source=meridian-demo",
      widgetScript: "/embed/loup-widget.js",
      widgetSnippet:
        '<script src="/embed/loup-widget.js"></script>\n<loup-benefits employer-id="meridian" employee-token="DEMO_SIGNED_TOKEN"></loup-benefits>',
      apiMode: "Headless API access is simulated in this MVP.",
    }),
  );
});

router.get("/v1/vendor/today", async (_req, res): Promise<void> => {
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

router.get("/v1/operations/overview", async (_req, res): Promise<void> => {
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

router.get("/v1/operations/audit", async (_req, res): Promise<void> => {
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