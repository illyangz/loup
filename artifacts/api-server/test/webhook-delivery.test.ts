import { describe, expect, it } from "vitest";
import {
  BACKOFF_BASE_MS,
  buildWebhookBody,
  MAX_ATTEMPTS,
  scheduleNextAttempt,
  signPayload,
  verifySignature,
} from "../src/lib/webhook-delivery";

describe("webhook signing (HMAC-SHA256)", () => {
  const secret = "0123456789abcdef0123456789abcdef";
  const body = JSON.stringify({ id: 42, eventType: "booking.created", payload: {}, createdAt: new Date().toISOString() });

  it("produces a sha256= prefix signature", () => {
    const signature = signPayload(secret, body);
    expect(signature.startsWith("sha256=")).toBe(true);
    expect(signature.length).toBe(7 + 64);
  });

  it("verifies a correct signature and rejects a tampered body", () => {
    const signature = signPayload(secret, body);
    expect(verifySignature(secret, signature, body)).toBe(true);
    expect(verifySignature(secret, signature, body + "tampered")).toBe(false);
  });

  it("rejects signatures from a different secret", () => {
    const signature = signPayload("another-secret", body);
    expect(verifySignature(secret, signature, body)).toBe(false);
  });

  it("is constant-time safe against length mismatches", () => {
    expect(verifySignature(secret, "sha256=short", body)).toBe(false);
  });
});

describe("webhook body shape", () => {
  it("carries id, eventType, payload and createdAt", () => {
    const createdAt = new Date("2026-08-19T10:00:00Z");
    const event = {
      id: 7,
      eventType: "payment.completed",
      payload: { amount: 250 },
      createdAt,
    } as never;
    const body = JSON.parse(buildWebhookBody(event));
    expect(body).toEqual({ id: 7, eventType: "payment.completed", payload: { amount: 250 }, createdAt: createdAt.toISOString() });
  });
});

describe("retry schedule", () => {
  it("backs off exponentially from the base delay", () => {
    expect(scheduleNextAttempt(1).getTime()).toBeCloseTo(Date.now() + BACKOFF_BASE_MS, -3);
    expect(scheduleNextAttempt(2).getTime()).toBeCloseTo(Date.now() + BACKOFF_BASE_MS * 2, -3);
    expect(scheduleNextAttempt(3).getTime()).toBeCloseTo(Date.now() + BACKOFF_BASE_MS * 4, -3);
  });

  it("caps the delay at one hour", () => {
    const far = scheduleNextAttempt(10);
    expect(far.getTime() - Date.now()).toBeLessThanOrEqual(60 * 60 * 1000);
  });

  it("stops retrying after MAX_ATTEMPTS", () => {
    expect(MAX_ATTEMPTS).toBe(5);
  });
});