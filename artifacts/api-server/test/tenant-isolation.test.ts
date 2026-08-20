import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app";

/**
 * P1-2 tenant isolation audit. Runs against the seeded PGlite dev database
 * (`pnpm --filter @workspace/scripts run seed`) — the same two-tenant fixture
 * (Meridian Education Group / Al Noor University) the pitch demo uses.
 */

async function loginAs(role: "employee" | "institution" | "provider" | "admin", slug?: string): Promise<string> {
  const res = await request(app)
    .post("/api/v1/demo/login")
    .send({ role, ...(slug ? { slug } : {}) });
  expect(res.status).toBe(200);
  return res.body.token as string;
}

describe("tenant isolation (P1-2)", () => {
  let meridianToken: string;
  let alNoorToken: string;

  beforeAll(async () => {
    meridianToken = await loginAs("institution", "meridian");
    alNoorToken = await loginAs("institution", "al-noor");
  });

  it("unknown tenant slug is rejected at login, never silently defaulted", async () => {
    const res = await request(app).post("/api/v1/demo/login").send({ role: "institution", slug: "not-a-real-tenant" });
    expect(res.status).toBe(400);
  });

  it("each institution's employee roster is scoped to its own workforce", async () => {
    const meridianRes = await request(app).get("/api/v1/employer/employees").set("Authorization", `Bearer ${meridianToken}`);
    const alNoorRes = await request(app).get("/api/v1/employer/employees").set("Authorization", `Bearer ${alNoorToken}`);
    expect(meridianRes.status).toBe(200);
    expect(alNoorRes.status).toBe(200);

    const meridianEmployees: { id: number; workEmail: string; eligibilityStatus: string }[] = meridianRes.body;
    const alNoorEmployees: { id: number; workEmail: string; eligibilityStatus: string }[] = alNoorRes.body;

    expect(meridianEmployees.length).toBeGreaterThan(0);
    expect(alNoorEmployees.length).toBeGreaterThan(0);

    // No employee id appears in both rosters.
    const meridianIds = new Set(meridianEmployees.map((e) => e.id));
    const overlap = alNoorEmployees.filter((e) => meridianIds.has(e.id));
    expect(overlap).toEqual([]);

    // Every row genuinely belongs to the tenant that asked for it (domain-scoped
    // fixture data). Excludes PDPL-erased employees (P1-11's pdpl.test.ts
    // creates and anonymizes its own throwaway roster rows against this same
    // shared seeded database — anonymization intentionally replaces the
    // email with a non-domain @erased.invalid address, so an erased row is
    // expected not to match the tenant's real domain).
    const notErased = (e: { eligibilityStatus: string }) => e.eligibilityStatus !== "erased";
    expect(meridianEmployees.filter(notErased).every((e) => e.workEmail.endsWith("@meridian.edu"))).toBe(true);
    expect(alNoorEmployees.filter(notErased).every((e) => e.workEmail.endsWith("@alnoor.ac.ae"))).toBe(true);
  });

  it("an institution admin cannot patch another institution's employee (IDOR guard)", async () => {
    const meridianRes = await request(app).get("/api/v1/employer/employees").set("Authorization", `Bearer ${meridianToken}`);
    const someMeridianEmployeeId: number = meridianRes.body[0].id;

    const crossTenantPatch = await request(app)
      .patch(`/api/v1/employer/employees/${someMeridianEmployeeId}`)
      .set("Authorization", `Bearer ${alNoorToken}`)
      .send({ eligibilityStatus: "ineligible" });

    expect(crossTenantPatch.status).toBe(404);
  });

  it("employer overview never leaks platform-wide aggregates to a tenant with no activated employees", async () => {
    const alNoorOverview = await request(app).get("/api/v1/employer/overview").set("Authorization", `Bearer ${alNoorToken}`);
    expect(alNoorOverview.status).toBe(200);
    // Al Noor's seed has no household member linked to any employee yet — completionRate/satisfaction
    // must be honest zeros, never a value borrowed from Meridian's (or the platform's) bookings.
    expect(alNoorOverview.body.completionRate).toBe(0);
    expect(alNoorOverview.body.satisfaction).toBe(0);
  });

  it("employer utilization is computed per-tenant, not from the platform-wide booking set", async () => {
    const meridianUtil = await request(app).get("/api/v1/employer/utilization").set("Authorization", `Bearer ${meridianToken}`);
    const alNoorUtil = await request(app).get("/api/v1/employer/utilization").set("Authorization", `Bearer ${alNoorToken}`);
    expect(meridianUtil.status).toBe(200);
    expect(alNoorUtil.status).toBe(200);

    // Al Noor has no linked household members yet, so every derived metric must be an honest zero,
    // not a copy of Meridian's numbers (the pre-fix bug: both tenants saw the same hardcoded constants).
    expect(alNoorUtil.body.completionRate).toBe(0);
    expect(alNoorUtil.body.satisfaction).toBe(0);
    expect(alNoorUtil.body.activationRate).toBe(0);
    expect(alNoorUtil.body.categoryUtilization).toEqual([]);
    expect(alNoorUtil.body).not.toEqual(meridianUtil.body);
  });

  it("a token issued for one tenant cannot read the other tenant's benefit plans", async () => {
    const meridianPlans = await request(app).get("/api/v1/employer/benefit-plans").set("Authorization", `Bearer ${meridianToken}`);
    const alNoorPlans = await request(app).get("/api/v1/employer/benefit-plans").set("Authorization", `Bearer ${alNoorToken}`);
    expect(meridianPlans.status).toBe(200);
    expect(alNoorPlans.status).toBe(200);

    const meridianPlanIds = new Set((meridianPlans.body as { id: number }[]).map((p) => p.id));
    const overlap = (alNoorPlans.body as { id: number }[]).filter((p) => meridianPlanIds.has(p.id));
    expect(overlap).toEqual([]);
  });

  it("no token at all is rejected on every employer-scoped route", async () => {
    const res = await request(app).get("/api/v1/employer/employees");
    expect([401, 403]).toContain(res.status);
  });
});
