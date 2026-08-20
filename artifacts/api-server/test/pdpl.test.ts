import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import { db, webhookEventsTable } from "@workspace/db";
import app from "../src/app";

/**
 * P1-11 PDPL posture: consent, data export, right-to-erasure, webhook
 * retention purge. Runs against the seeded PGlite dev database — Meridian has
 * consent pre-recorded (seed), Al Noor deliberately doesn't.
 */

async function loginAs(role: "institution" | "admin", slug?: string): Promise<string> {
  const res = await request(app).post("/api/v1/demo/login").send({ role, ...(slug ? { slug } : {}) });
  expect(res.status).toBe(200);
  return res.body.token as string;
}

describe("PDPL consent (P1-11)", () => {
  it("Meridian's seeded consent is already recorded", async () => {
    const token = await loginAs("institution", "meridian");
    const res = await request(app).get("/api/v1/employer/consent").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.consented).toBe(true);
    expect(res.body.consentedBy).toBeTruthy();
  });

  it("Al Noor has not consented yet", async () => {
    const token = await loginAs("institution", "al-noor");
    const res = await request(app).get("/api/v1/employer/consent").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.consented).toBe(false);
    expect(res.body.consentedAt).toBeNull();
  });

  it("recording consent for Al Noor makes it show as consented", async () => {
    const token = await loginAs("institution", "al-noor");
    const post = await request(app).post("/api/v1/employer/consent").set("Authorization", `Bearer ${token}`);
    expect(post.status).toBe(200);
    expect(post.body.consented).toBe(true);

    const get = await request(app).get("/api/v1/employer/consent").set("Authorization", `Bearer ${token}`);
    expect(get.body.consented).toBe(true);

    // Meridian's own consent is untouched by Al Noor's action (tenant isolation).
    const meridianToken = await loginAs("institution", "meridian");
    const meridianGet = await request(app).get("/api/v1/employer/consent").set("Authorization", `Bearer ${meridianToken}`);
    expect(meridianGet.body.consentedBy).not.toBe(post.body.consentedBy);
  });
});

describe("PDPL data export (P1-11)", () => {
  it("returns a full bundle scoped to the requesting institution only", async () => {
    const meridianToken = await loginAs("institution", "meridian");
    const alNoorToken = await loginAs("institution", "al-noor");
    const [meridianExport, alNoorExport] = await Promise.all([
      request(app).get("/api/v1/employer/data-export").set("Authorization", `Bearer ${meridianToken}`),
      request(app).get("/api/v1/employer/data-export").set("Authorization", `Bearer ${alNoorToken}`),
    ]);
    expect(meridianExport.status).toBe(200);
    expect(alNoorExport.status).toBe(200);
    expect(meridianExport.body.employees.length).toBeGreaterThan(0);
    expect(alNoorExport.body.employees.length).toBeGreaterThan(0);

    const meridianIds = new Set(meridianExport.body.employees.map((e: { id: number }) => e.id));
    const overlap = alNoorExport.body.employees.filter((e: { id: number }) => meridianIds.has(e.id));
    expect(overlap).toEqual([]);
    expect(meridianExport.body.institutionName).not.toBe(alNoorExport.body.institutionName);
  });
});

describe("PDPL right to erasure (P1-11)", () => {
  // Creates its own throwaway employee for each test rather than erasing a
  // seeded roster row — erasure is destructive (anonymizes name/email in
  // place) and the seeded roster is shared, pristine state other test files
  // (e.g. tenant-isolation.test.ts's "every row ends in @meridian.edu" check)
  // depend on.
  async function createThrowawayEmployee(token: string): Promise<{ id: number; name: string }> {
    const res = await request(app)
      .post("/api/v1/employer/employees/add")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Throwaway Test Employee", workEmail: `throwaway-${Date.now()}@meridian.edu`, department: "Test", benefitTier: "Staff" });
    expect(res.status).toBe(201);
    return { id: res.body.id, name: res.body.name };
  }

  it("anonymizes PII, preserves the row, and writes an audit event", async () => {
    const token = await loginAs("institution", "meridian");
    const target = await createThrowawayEmployee(token);

    const res = await request(app).post(`/api/v1/employer/employees/${target.id}/erase`).set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe(`Erased Employee #${target.id}`);
    expect(res.body.workEmail).toContain("@erased.invalid");
    expect(res.body.eligibilityStatus).toBe("erased");
    expect(res.body.name).not.toBe(target.name);

    const adminToken = await loginAs("admin");
    const audit = await request(app).get("/api/v1/operations/audit").set("Authorization", `Bearer ${adminToken}`);
    const entry = audit.body.find((e: { action: string; entityId: string }) => e.action === "employee.erased" && e.entityId === String(target.id));
    expect(entry).toBeTruthy();
  });

  it("cannot erase another institution's employee (IDOR guard)", async () => {
    const meridianToken = await loginAs("institution", "meridian");
    const target = await createThrowawayEmployee(meridianToken);

    const alNoorToken = await loginAs("institution", "al-noor");
    const res = await request(app).post(`/api/v1/employer/employees/${target.id}/erase`).set("Authorization", `Bearer ${alNoorToken}`);
    expect(res.status).toBe(404);
  });
});

describe("webhook event retention purge (P1-11)", () => {
  let adminToken: string;

  beforeAll(async () => {
    adminToken = await loginAs("admin");
  });

  it("purges only resolved events older than the retention window, never pending ones", async () => {
    const old = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000);
    const recent = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000);
    const inserted = await db
      .insert(webhookEventsTable)
      .values([
        { eventType: "test.old.delivered", payload: {}, status: "delivered", createdAt: old, deliveredAt: old },
        { eventType: "test.recent.delivered", payload: {}, status: "delivered", createdAt: recent, deliveredAt: recent },
        { eventType: "test.old.pending", payload: {}, status: "pending", createdAt: old },
      ])
      .returning({ id: webhookEventsTable.id, eventType: webhookEventsTable.eventType });
    const oldDeliveredId = inserted.find((r) => r.eventType === "test.old.delivered")!.id;
    const recentDeliveredId = inserted.find((r) => r.eventType === "test.recent.delivered")!.id;
    const oldPendingId = inserted.find((r) => r.eventType === "test.old.pending")!.id;

    const res = await request(app).post("/api/v1/admin/webhook-events/purge").set("Authorization", `Bearer ${adminToken}`).send({ olderThanDays: 90 });
    expect(res.status).toBe(200);
    expect(res.body.retentionDays).toBe(90);
    expect(res.body.purged).toBeGreaterThanOrEqual(1);

    const remaining = await db.select({ id: webhookEventsTable.id }).from(webhookEventsTable);
    const remainingIds = new Set(remaining.map((r) => r.id));
    expect(remainingIds.has(oldDeliveredId)).toBe(false); // purged: old + resolved
    expect(remainingIds.has(recentDeliveredId)).toBe(true); // kept: too recent
    expect(remainingIds.has(oldPendingId)).toBe(true); // kept: still pending, never purged regardless of age
  });

  it("defaults to a 90-day retention window when no body is sent", async () => {
    const res = await request(app).post("/api/v1/admin/webhook-events/purge").set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.retentionDays).toBe(90);
  });
});
