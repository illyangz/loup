import { createHmac, timingSafeEqual } from "node:crypto";
import { and, asc, eq, inArray, lte } from "drizzle-orm";
import { bookingsTable, db, employeesTable, institutionsTable, webhookEndpointsTable, webhookEventsTable } from "@workspace/db";
import type { WebhookEventRow } from "@workspace/db";
import { logger } from "./logger";

// ─── Webhook delivery engine (P1-3) ──────────────────────────────────────────
// Outbox pattern: every event is a row in webhook_events. When the institution
// has an active webhook_endpoint, the event is enqueued (status=pending,
// nextAttemptAt=now) and an in-process worker delivers it with an HMAC-SHA256
// signature. Without an endpoint the event is simulated as delivered (demo).

export const MAX_ATTEMPTS = 5;
export const BACKOFF_BASE_MS = 30_000;

export function signPayload(secret: string, body: string): string {
  return `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`;
}

export function verifySignature(secret: string, signature: string, body: string): boolean {
  const expected = signPayload(secret, body);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Exponential backoff with a hard cap: 30s, 60s, 2m, 4m, then max attempts. */
export function scheduleNextAttempt(attempts: number): Date {
  const base = BACKOFF_BASE_MS;
  const delay = Math.min(base * 2 ** Math.max(0, attempts - 1), 60 * 60 * 1000);
  return new Date(Date.now() + delay);
}

export function buildWebhookBody(event: WebhookEventRow): string {
  return JSON.stringify({
    id: event.id,
    eventType: event.eventType,
    payload: event.payload,
    createdAt: event.createdAt,
  });
}

// ─── Tenant resolution from an event payload (best effort) ──────────────────

export async function resolveInstitutionId(payload: Record<string, unknown>): Promise<number | null> {
  if (typeof payload.institutionId === "number") return payload.institutionId;
  if (typeof payload.employerId === "number") {
    const [employee] = await db
      .select({ institutionId: employeesTable.institutionId })
      .from(employeesTable)
      .where(eq(employeesTable.employerId, payload.employerId))
      .limit(1);
    if (employee?.institutionId != null) return employee.institutionId;
  }
  if (typeof payload.bookingId === "number") {
    const [booking] = await db
      .select({ memberId: bookingsTable.memberId })
      .from(bookingsTable)
      .where(eq(bookingsTable.id, payload.bookingId));
    if (booking) {
      const [employee] = await db
        .select({ institutionId: employeesTable.institutionId })
        .from(employeesTable)
        .where(eq(employeesTable.linkedMemberId, booking.memberId));
      if (employee?.institutionId != null) return employee.institutionId;
    }
  }
  return null;
}

async function activeEndpointsForInstitution(institutionId: number) {
  return db
    .select()
    .from(webhookEndpointsTable)
    .where(and(eq(webhookEndpointsTable.institutionId, institutionId), eq(webhookEndpointsTable.active, true)));
}

export async function institutionHasEndpoints(institutionId: number): Promise<boolean> {
  const rows = await activeEndpointsForInstitution(institutionId);
  return rows.length > 0;
}

// ─── Delivery worker ─────────────────────────────────────────────────────────

let workerTimer: ReturnType<typeof setInterval> | null = null;

async function deliverEvent(event: WebhookEventRow): Promise<void> {
  const institutionId = await resolveInstitutionId(event.payload as Record<string, unknown>);
  const endpoints = institutionId == null ? [] : await activeEndpointsForInstitution(institutionId);
  if (endpoints.length === 0) {
    // Demo mode: no endpoint configured — simulate delivery as before.
    await db
      .update(webhookEventsTable)
      .set({ status: "delivered", deliveredAt: new Date() })
      .where(eq(webhookEventsTable.id, event.id));
    return;
  }

  const body = buildWebhookBody(event);
  let lastStatus = 0;
  let lastError: string | null = null;
  let lastEndpointId: number | null = null;

  for (const endpoint of endpoints) {
    const signature = signPayload(endpoint.secret, body);
    try {
      const res = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Loup-Signature": signature,
          "X-Loup-Event-Id": String(event.id),
          "X-Loup-Event-Type": event.eventType,
          "X-Loup-Timestamp": String(Math.floor(Date.now() / 1000)),
          "Idempotency-Key": `loup-event-${event.id}`,
        },
        body,
      });
      lastStatus = res.status;
      lastEndpointId = endpoint.id;
      if (res.ok) {
        await db
          .update(webhookEventsTable)
          .set({
            status: "delivered",
            deliveredAt: new Date(),
            lastHttpStatus: res.status,
            lastError: null,
            signature,
            signedPayload: body,
            endpointId: endpoint.id,
          })
          .where(eq(webhookEventsTable.id, event.id));
        logger.info({ eventId: event.id, endpointId: endpoint.id, status: res.status }, "Webhook delivered");
        return;
      }
      lastError = `HTTP ${res.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  const attempts = event.attempts + 1;
  const exhausted = attempts >= MAX_ATTEMPTS;
  await db
    .update(webhookEventsTable)
    .set({
      status: exhausted ? "failed" : "pending",
      attempts,
      nextAttemptAt: exhausted ? null : scheduleNextAttempt(attempts),
      lastHttpStatus: lastStatus || null,
      lastError,
      endpointId: lastEndpointId ?? event.endpointId,
      signature: undefined,
      signedPayload: body,
      deliveredAt: null,
    })
    .where(eq(webhookEventsTable.id, event.id));
  logger.warn({ eventId: event.id, attempts, lastError }, exhausted ? "Webhook failed (max attempts)" : "Webhook retry scheduled");
}

export async function processDueEvents(): Promise<void> {
  const due = await db
    .select()
    .from(webhookEventsTable)
    .where(and(inArray(webhookEventsTable.status, ["pending", "failed"]), lte(webhookEventsTable.nextAttemptAt, new Date())))
    .orderBy(asc(webhookEventsTable.id))
    .limit(20);
  for (const event of due) {
    await deliverEvent(event);
  }
}

export function startWebhookWorker(): void {
  if (workerTimer) return;
  workerTimer = setInterval(() => {
    void processDueEvents().catch((err) => logger.warn({ err }, "Webhook worker tick failed"));
  }, 5_000);
}

export function stopWebhookWorker(): void {
  if (workerTimer) {
    clearInterval(workerTimer);
    workerTimer = null;
  }
}

export async function enqueueEventForDelivery(eventId: number): Promise<void> {
  await db
    .update(webhookEventsTable)
    .set({ status: "pending", attempts: 0, nextAttemptAt: new Date(), deliveredAt: null })
    .where(eq(webhookEventsTable.id, eventId));
}