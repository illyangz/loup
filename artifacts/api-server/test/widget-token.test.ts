import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app";
import { verifyDemoToken } from "../src/lib/auth";

/**
 * P1-7 widget token exchange. Assumes the seeded PGlite dev database
 * (`pnpm --filter @workspace/scripts run seed`) — Meridian has a fixed demo
 * widgetSecret; Al Noor deliberately has none (widget not provisioned).
 */

const MERIDIAN_SECRET = "demo-widget-secret-meridian-3f9a1c2b8e7d4056";

describe("POST /v1/widget/token (P1-7)", () => {
  it("issues a short-lived employee token for a valid institution + employee + secret", async () => {
    const res = await request(app)
      .post("/api/v1/widget/token")
      .set("X-Loup-Widget-Secret", MERIDIAN_SECRET)
      .send({ institutionSlug: "meridian-international", externalEmployeeId: "MEG-0001" });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.expiresInSeconds).toBe(15 * 60);
    expect(res.body.employeeName).toBeTruthy();

    const principal = await verifyDemoToken(res.body.token);
    expect(principal?.role).toBe("employee");
    expect(principal?.tenantId).toBeTypeOf("number");
  });

  it("rejects a wrong secret", async () => {
    const res = await request(app)
      .post("/api/v1/widget/token")
      .set("X-Loup-Widget-Secret", "not-the-real-secret")
      .send({ institutionSlug: "meridian-international", externalEmployeeId: "MEG-0001" });
    expect(res.status).toBe(401);
  });

  it("rejects a missing secret header", async () => {
    const res = await request(app)
      .post("/api/v1/widget/token")
      .send({ institutionSlug: "meridian-international", externalEmployeeId: "MEG-0001" });
    expect(res.status).toBe(401);
  });

  it("503s for an institution with no widget secret provisioned (Al Noor)", async () => {
    const res = await request(app)
      .post("/api/v1/widget/token")
      .set("X-Loup-Widget-Secret", "anything")
      .send({ institutionSlug: "al-noor-university", externalEmployeeId: "ANU-0001" });
    expect(res.status).toBe(503);
  });

  it("404s for an unknown institution slug", async () => {
    const res = await request(app)
      .post("/api/v1/widget/token")
      .set("X-Loup-Widget-Secret", MERIDIAN_SECRET)
      .send({ institutionSlug: "not-a-real-institution", externalEmployeeId: "MEG-0001" });
    expect(res.status).toBe(404);
  });

  it("404s for an unknown employee under a correctly-authenticated institution", async () => {
    const res = await request(app)
      .post("/api/v1/widget/token")
      .set("X-Loup-Widget-Secret", MERIDIAN_SECRET)
      .send({ institutionSlug: "meridian-international", externalEmployeeId: "NOT-A-REAL-EMPLOYEE" });
    expect(res.status).toBe(404);
  });

  it("Meridian's secret cannot mint a token for an Al Noor employee (cross-tenant guard)", async () => {
    const res = await request(app)
      .post("/api/v1/widget/token")
      .set("X-Loup-Widget-Secret", MERIDIAN_SECRET)
      .send({ institutionSlug: "al-noor-university", externalEmployeeId: "ANU-0001" });
    // Al Noor has no secret provisioned, so this is a 503, not a leak —
    // Meridian's secret is never even checked against the wrong institution.
    expect(res.status).toBe(503);
  });
});
