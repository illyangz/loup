import { desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  auditEventsTable,
  bookingsTable,
  db,
  employeesTable,
  employersTable,
  membersTable,
  routinesTable,
} from "@workspace/db";
import {
  GetEmployeeOverviewResponse,
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
    slug: "home-cleaning",
    name: "Home Cleaning",
    description: "Save time on recurring home care.",
    dimension: "Time wellbeing · Home wellbeing",
    publicPrice: 199,
    corporatePrice: 179,
    employerContribution: 120,
    employeeCopayment: 59,
    durationMinutes: 180,
    providerVerification: "Licensed provider, background-checked crew",
  },
  {
    slug: "laundry",
    name: "Laundry & Pressing",
    description: "Keep laundry moving without losing an evening.",
    dimension: "Time wellbeing · Home wellbeing",
    publicPrice: 95,
    corporatePrice: 85,
    employerContribution: 50,
    employeeCopayment: 35,
    durationMinutes: 30,
    providerVerification: "Verified collection and delivery partner",
  },
  {
    slug: "home-maintenance",
    name: "Home Maintenance",
    description: "Keep your home comfortable and functional.",
    dimension: "Home wellbeing · Financial wellbeing",
    publicPrice: 249,
    corporatePrice: 224,
    employerContribution: 150,
    employeeCopayment: 74,
    durationMinutes: 90,
    providerVerification: "Trade-authorized maintenance partner",
  },
];

const routineFallback = [
  {
    id: 1,
    label: "Weekly home care",
    categorySlug: "home-cleaning",
    frequency: "Weekly",
    preferredDay: "Saturday",
    preferredTime: "10:00",
    maxCopayment: 75,
    manualConfirmation: true,
    status: "active",
  },
  {
    id: 2,
    label: "Quarterly cooling check",
    categorySlug: "home-maintenance",
    frequency: "Quarterly",
    preferredDay: "First Sunday",
    preferredTime: "09:00",
    maxCopayment: 100,
    manualConfirmation: true,
    status: "active",
  },
];

const roleChoices = [
  {
    role: "employee" as const,
    label: "Employee application",
    description: "Omar’s private allowance, bookings, routines and household.",
    href: "/employee",
  },
  {
    role: "employer" as const,
    label: "Employer portal",
    description: "Nexa HR’s aggregate benefit governance and reporting view.",
    href: "/employer",
  },
  {
    role: "vendor" as const,
    label: "Vendor portal",
    description: "Bright Home Services’ capacity, demand and performance view.",
    href: "/vendor",
  },
  {
    role: "operations" as const,
    label: "Operations control tower",
    description: "Loup operations’ demand, matching, quality and audit view.",
    href: "/operations",
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

  const [employer] = await db
    .select()
    .from(employersTable)
    .where(eq(employersTable.slug, "nexa"));
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

  req.log.info({ role: "employee" }, "Serving employee platform overview");
  res.json(
    GetEmployeeOverviewResponse.parse({
      employeeName: member.name,
      employerName: employer?.name ?? "Nexa Technologies",
      allowance: {
        authorized: 500,
        reserved: 120,
        redeemed: 85,
        available: 295,
        renewalDate: "1 September 2026",
        expiration: "Unused allowance expires at the end of each benefit period.",
      },
      upcomingBooking: upcoming ?? null,
      metrics: {
        employerSupport: 420,
        corporateSavings: 74,
        servicesCompleted: 7,
        estimatedTimeSavedMinutes: 690,
        householdAllocations: 180,
      },
      activeCategories,
      routines: routines.length > 0 ? routines : routineFallback,
    }),
  );
});

router.get("/v1/employer/overview", async (_req, res): Promise<void> => {
  const employees = await db.select().from(employeesTable);
  const bookings = await fetchBookingViews();
  const completed = bookings.filter((booking) => booking.status === "completed");
  res.json(
    GetEmployerOverviewResponse.parse({
      employerName: "Nexa Technologies",
      eligibleEmployees: employees.length || 126,
      activatedEmployees: employees.length ? Math.min(82, employees.length) : 82,
      authorizedMaximum: 63000,
      redeemedAllowances: completed.length ? 8610 : 4820,
      reservedAllowances: 1920,
      forecastRedemptions: 12400,
      invoiceEstimate: 10530,
      completionRate: 96.4,
      satisfaction: 4.8,
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
      externalEmployeeId: "NEXA-0001",
      name: "Omar Mansour",
      workEmail: "omar.mansour@nexa.example",
      department: "Strategy",
      benefitTier: "Core",
      eligibilityStatus: "eligible",
      householdEligible: true,
    },
    {
      id: 2,
      externalEmployeeId: "NEXA-0002",
      name: "Sara Haddad",
      workEmail: "sara.haddad@nexa.example",
      department: "People",
      benefitTier: "Core",
      eligibilityStatus: "eligible",
      householdEligible: true,
    },
    {
      id: 3,
      externalEmployeeId: "NEXA-0003",
      name: "Karim Nassar",
      workEmail: "karim.nassar@nexa.example",
      department: "Engineering",
      benefitTier: "Plus",
      eligibilityStatus: "eligible",
      householdEligible: false,
    },
  ];
  res.json(ListEmployerEmployeesResponse.parse(rows.length ? rows : fallback));
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
      message: `${imported} roster rows validated. No HRIS connection was used.`,
    }),
  );
});

router.get("/v1/employer/utilization", async (_req, res): Promise<void> => {
  const bookings = await fetchBookingViews();
  const completed = bookings.filter((booking) => booking.status === "completed");
  const byCategory = new Map<string, number>();
  for (const booking of bookings) {
    const category =
      booking.categoryName === "AC & Cooling" ||
      booking.categoryName === "Handyman"
        ? "Home Maintenance"
        : booking.categoryName === "Laundry & Pressing"
          ? "Laundry & Pressing"
          : booking.categoryName === "Home Cleaning"
            ? "Home Cleaning"
            : null;
    if (category) byCategory.set(category, (byCategory.get(category) ?? 0) + 1);
  }
  const total = [...byCategory.values()].reduce((sum, count) => sum + count, 0) || 1;
  res.json(
    GetEmployerUtilizationResponse.parse({
      activationRate: 65.1,
      redemptionRate: 42.8,
      repeatUsageRate: 54.2,
      averageSupportPerActiveEmployee: 148.6,
      categoryUtilization: (byCategory.size
        ? [...byCategory.entries()]
        : [
            ["Home Cleaning", 31],
            ["Home Maintenance", 19],
            ["Laundry & Pressing", 12],
          ]
      ).map(([category, count]) => ({
        category,
        bookings: count,
        share: Math.round((Number(count) / total) * 1000) / 10,
      })),
      corporateSavings: 1860,
      estimatedTimeSavedMinutes: completed.length * 90 || 5580,
      satisfaction: 4.8,
      completionRate: 96.4,
      serviceRecoveryRate: 98.2,
    }),
  );
});

router.get("/v1/employer/integrations", (_req, res): void => {
  res.json(
    GetEmployerIntegrationsResponse.parse({
      ssoLabel: "Simulated SSO launch",
      ssoUrl: "/login?role=employee&source=nexa-demo",
      widgetScript: "/embed/loup-widget.js",
      widgetSnippet:
        '<script src="/embed/loup-widget.js"></script>\n<loup-benefits employer-id="nexa" employee-token="DEMO_SIGNED_TOKEN"></loup-benefits>',
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
      vendorName: "Bright Home Services",
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
      vendorName: "Bright Home Services",
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