import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import app from "../src/app";

/**
 * P1-9 test matrix: booking status transitions. Runs against the seeded
 * PGlite dev database (`pnpm --filter @workspace/scripts run seed`) — books
 * against Marina Shine Cleaning (provider id 1) since the demo provider login
 * always resolves to that provider.
 */

async function loginAs(role: "employee" | "provider"): Promise<string> {
  const res = await request(app).post("/api/v1/demo/login").send({ role });
  expect(res.status).toBe(200);
  return res.body.token as string;
}

async function createBooking(employeeToken: string): Promise<number> {
  const [addressesRes, providerRes] = await Promise.all([
    request(app).get("/api/addresses").set("Authorization", `Bearer ${employeeToken}`),
    request(app).get("/api/providers/1").set("Authorization", `Bearer ${employeeToken}`),
  ]);
  const addressId: number = addressesRes.body[0].id;
  const serviceId: number = providerRes.body.services[0].id;

  const res = await request(app)
    .post("/api/bookings")
    .set("Authorization", `Bearer ${employeeToken}`)
    .send({ serviceId, addressId, scheduledAt: "2026-09-01T10:00:00.000Z" });
  expect(res.status).toBe(201);
  expect(res.body.status).toBe("pending");
  return res.body.id;
}

describe("booking status transitions (P1-9)", () => {
  let employeeToken: string;
  let providerToken: string;

  beforeAll(async () => {
    employeeToken = await loginAs("employee");
    providerToken = await loginAs("provider");
  });

  it("advances through the full status chain in order: pending → accepted → confirmed → en_route → arrived → in_progress → completed", async () => {
    const id = await createBooking(employeeToken);
    const expectedChain = ["accepted", "confirmed", "en_route", "arrived", "in_progress", "completed"];
    for (const expectedStatus of expectedChain) {
      const res = await request(app).post(`/api/v1/provider/orders/${id}/advance`).set("Authorization", `Bearer ${providerToken}`).send({});
      expect(res.status).toBe(200);
      expect(res.body.status).toBe(expectedStatus);
    }
  });

  it("cannot advance a booking past a terminal status", async () => {
    const id = await createBooking(employeeToken);
    const chain = ["accepted", "confirmed", "en_route", "arrived", "in_progress", "completed"];
    for (const _ of chain) {
      await request(app).post(`/api/v1/provider/orders/${id}/advance`).set("Authorization", `Bearer ${providerToken}`).send({});
    }
    const res = await request(app).post(`/api/v1/provider/orders/${id}/advance`).set("Authorization", `Bearer ${providerToken}`).send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/terminal status/);
  });

  it("cannot accept a booking that's already been accepted", async () => {
    const id = await createBooking(employeeToken);
    const first = await request(app).post(`/api/v1/provider/orders/${id}/accept`).set("Authorization", `Bearer ${providerToken}`).send({});
    expect(first.status).toBe(200);
    const second = await request(app).post(`/api/v1/provider/orders/${id}/accept`).set("Authorization", `Bearer ${providerToken}`).send({});
    expect(second.status).toBe(400);
    expect(second.body.error).toContain("accepted");
  });

  it("cannot reject a booking that's already in a terminal status", async () => {
    const id = await createBooking(employeeToken);
    const rejected = await request(app).post(`/api/v1/provider/orders/${id}/reject`).set("Authorization", `Bearer ${providerToken}`).send({});
    expect(rejected.status).toBe(200);
    expect(rejected.body.status).toBe("rejected");
    const secondReject = await request(app).post(`/api/v1/provider/orders/${id}/reject`).set("Authorization", `Bearer ${providerToken}`).send({});
    expect(secondReject.status).toBe(400);
  });

  it("cannot accept a booking that was already rejected", async () => {
    const id = await createBooking(employeeToken);
    await request(app).post(`/api/v1/provider/orders/${id}/reject`).set("Authorization", `Bearer ${providerToken}`).send({});
    const res = await request(app).post(`/api/v1/provider/orders/${id}/accept`).set("Authorization", `Bearer ${providerToken}`).send({});
    expect(res.status).toBe(400);
  });
});
