import express, { type Express } from "express";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { withIdempotency } from "../src/lib/idempotency";

/**
 * P1-4 idempotency middleware. Exercised against a throwaway Express app (not
 * the real bookings/billing routes) so these tests only ever touch the
 * idempotency_records table — never the seeded demo's booking/statement data.
 */

function buildTestApp(): { app: Express; getCallCount: () => number } {
  const app = express();
  app.use(express.json());
  let callCount = 0;
  app.post("/test-op", withIdempotency("POST /test-op", async (req, res) => {
    callCount++;
    res.status(201).json({ callCount, echo: req.body });
  }));
  app.post("/other-op", withIdempotency("POST /other-op", async (req, res) => {
    callCount++;
    res.status(201).json({ callCount, echo: req.body });
  }));
  app.post("/flaky-op", withIdempotency("POST /flaky-op", async (req, res) => {
    callCount++;
    if (callCount === 1) throw new Error("simulated handler failure");
    res.status(201).json({ callCount });
  }));
  // Express 5 auto-catches async rejections, but a thrown error still needs an
  // error-handling middleware to produce a response instead of hanging.
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    res.status(500).send("error");
  });
  return { app, getCallCount: () => callCount };
}

function uniqueKey(): string {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

describe("withIdempotency (P1-4)", () => {
  let app: Express;
  let getCallCount: () => number;

  beforeEach(() => {
    ({ app, getCallCount } = buildTestApp());
  });

  it("without a header, every request runs the handler (no behavior change for existing clients)", async () => {
    const first = await request(app).post("/test-op").send({ n: 1 });
    const second = await request(app).post("/test-op").send({ n: 2 });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(getCallCount()).toBe(2);
  });

  it("a repeated key replays the first response instead of re-running the handler", async () => {
    const key = uniqueKey();
    const first = await request(app).post("/test-op").set("Idempotency-Key", key).send({ n: 1 });
    const second = await request(app).post("/test-op").set("Idempotency-Key", key).send({ n: 999 }); // even a different body is ignored — replay wins
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body).toEqual(first.body);
    expect(getCallCount()).toBe(1);
  });

  it("different keys are independent — the handler runs once per key", async () => {
    const first = await request(app).post("/test-op").set("Idempotency-Key", uniqueKey()).send({ n: 1 });
    const second = await request(app).post("/test-op").set("Idempotency-Key", uniqueKey()).send({ n: 2 });
    expect(first.body).not.toEqual(second.body);
    expect(getCallCount()).toBe(2);
  });

  it("reusing a key against a different operation is rejected, not replayed", async () => {
    const key = uniqueKey();
    const first = await request(app).post("/test-op").set("Idempotency-Key", key).send({});
    expect(first.status).toBe(201);
    const crossOp = await request(app).post("/other-op").set("Idempotency-Key", key).send({});
    expect(crossOp.status).toBe(409);
    expect(getCallCount()).toBe(1);
  });

  it("two truly concurrent requests with the same new key only run the handler once", async () => {
    const key = uniqueKey();
    const [a, b] = await Promise.all([
      request(app).post("/test-op").set("Idempotency-Key", key).send({ from: "a" }),
      request(app).post("/test-op").set("Idempotency-Key", key).send({ from: "b" }),
    ]);
    expect(getCallCount()).toBe(1);
    expect([a.status, b.status].every((s) => s === 201)).toBe(true);
    expect(a.body).toEqual(b.body);
  });

  it("if the handler throws, the reservation is released so a retry with the same key can actually run", async () => {
    const key = uniqueKey();
    const failed = await request(app).post("/flaky-op").set("Idempotency-Key", key).send({});
    expect(failed.status).toBe(500);
    // The reservation delete is awaited before the error response is sent
    // (see lib/idempotency.ts), so the retry is safe to issue immediately.
    const retried = await request(app).post("/flaky-op").set("Idempotency-Key", key).send({});
    expect(retried.status).toBe(201);
    expect(getCallCount()).toBe(2); // handler actually ran twice: once failed, once succeeded
  });
});
