import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { and, count, desc, eq, inArray, lt } from "drizzle-orm";
import { db, institutionsTable, webhookEndpointsTable, webhookEventsTable } from "@workspace/db";
import {
  ListAdminWebhookEventsResponse,
  ReplayAdminWebhookEventResponse,
  ListAdminWebhookEndpointsResponse,
  CreateAdminWebhookEndpointResponse,
  DeactivateAdminWebhookEndpointResponse,
  PurgeAdminWebhookEventsBody,
  PurgeAdminWebhookEventsResponse,
} from "@workspace/api-zod";
import { requireRole } from "../lib/auth";
import { generateSigningSecret } from "../lib/sso";
import { MAX_ATTEMPTS, scheduleNextAttempt, enqueueEventForDelivery } from "../lib/webhook-delivery";

const router: IRouter = Router();

// ── Role guard ────────────────────────────────────────────────────────────────

function requireAdminRole(req: Request, res: Response, next: NextFunction): void {
  void requireRole("admin")(req, res, next);
}

router.use(requireAdminRole);

// ── Webhook event log (read-side, P0-3) ───────────────────────────────────────

router.get("/v1/admin/webhook-events", async (_req, res): Promise<void> => {
  const [events, totals, byTypeRows] = await Promise.all([
    db
      .select()
      .from(webhookEventsTable)
      .orderBy(desc(webhookEventsTable.createdAt), desc(webhookEventsTable.id))
      .limit(100),
    db
      .select({ status: webhookEventsTable.status, count: count() })
      .from(webhookEventsTable)
      .groupBy(webhookEventsTable.status),
    db
      .select({ eventType: webhookEventsTable.eventType, count: count() })
      .from(webhookEventsTable)
      .groupBy(webhookEventsTable.eventType)
      .orderBy(desc(count())),
  ]);

  const statusCounts = Object.fromEntries(totals.map((t) => [t.status, t.count]));
  const total = totals.reduce((sum, t) => sum + t.count, 0);

  res.json(
    ListAdminWebhookEventsResponse.parse({
      events: events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        payload: e.payload,
        status: e.status,
        attempts: e.attempts,
        lastHttpStatus: e.lastHttpStatus,
        lastError: e.lastError,
        nextAttemptAt: e.nextAttemptAt?.toISOString() ?? null,
        deliveredAt: e.deliveredAt?.toISOString() ?? null,
        createdAt: e.createdAt.toISOString(),
      })),
      summary: {
        total,
        delivered: statusCounts["delivered"] ?? 0,
        failed: statusCounts["failed"] ?? 0,
        pending: statusCounts["pending"] ?? 0,
        byType: byTypeRows.map((r) => ({ eventType: r.eventType, count: r.count })),
      },
    }),
  );
});

// ── Webhook endpoints (P1-3) ──────────────────────────────────────────────────

router.get("/v1/admin/webhook-endpoints", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      id: webhookEndpointsTable.id,
      institutionId: webhookEndpointsTable.institutionId,
      institutionName: institutionsTable.name,
      url: webhookEndpointsTable.url,
      active: webhookEndpointsTable.active,
      createdAt: webhookEndpointsTable.createdAt,
    })
    .from(webhookEndpointsTable)
    .innerJoin(institutionsTable, eq(webhookEndpointsTable.institutionId, institutionsTable.id))
    .orderBy(desc(webhookEndpointsTable.createdAt));
  res.json(
    ListAdminWebhookEndpointsResponse.parse({
      endpoints: rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    }),
  );
});

router.post("/v1/admin/webhook-endpoints", async (req, res): Promise<void> => {
  const body = req.body as { institutionId?: unknown; url?: unknown };
  const institutionId = Number(body.institutionId);
  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!Number.isInteger(institutionId) || institutionId <= 0) {
    res.status(400).json({ error: "institutionId (number) is required" });
    return;
  }
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    res.status(400).json({ error: "url must be a valid absolute URL (https://...)" });
    return;
  }
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    res.status(400).json({ error: "url must use http or https" });
    return;
  }

  const secret = generateSigningSecret();
  const [endpoint] = await db
    .insert(webhookEndpointsTable)
    .values({ institutionId, url, secret, active: true })
    .returning();
  if (!endpoint) {
    res.status(500).json({ error: "Failed to create endpoint" });
    return;
  }

  res.status(201).json(
    CreateAdminWebhookEndpointResponse.parse({
      id: endpoint.id,
      institutionId: endpoint.institutionId,
      url: endpoint.url,
      active: endpoint.active,
      secret,
    }),
  );
});

router.delete("/v1/admin/webhook-endpoints/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [endpoint] = await db
    .update(webhookEndpointsTable)
    .set({ active: false })
    .where(eq(webhookEndpointsTable.id, id))
    .returning();
  if (!endpoint) {
    res.status(404).json({ error: "Endpoint not found" });
    return;
  }
  res.json(DeactivateAdminWebhookEndpointResponse.parse({ ok: true, id: endpoint.id }));
});

// ── Replay (P1-3) ─────────────────────────────────────────────────────────────

router.post("/v1/admin/webhook-events/:id/replay", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  const [event] = await db
    .select()
    .from(webhookEventsTable)
    .where(eq(webhookEventsTable.id, id));
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  const payload = event.payload as Record<string, unknown>;
  await enqueueEventForDelivery(event.id);
  res.json(
    ReplayAdminWebhookEventResponse.parse({
      ok: true,
      id: event.id,
      status: "pending",
      nextAttemptAt: new Date().toISOString(),
      maxAttempts: MAX_ATTEMPTS,
      backoffSeconds: scheduleNextAttempt(1).getTime() / 1000,
      payload,
    }),
  );
});

// ── Retention purge (P1-11) ───────────────────────────────────────────────────
// PDPL data-minimization: resolved webhook events (delivered/failed) don't
// need to be kept indefinitely. Pending events are never purged regardless of
// age — an event still awaiting delivery isn't "resolved" data. A real
// deployment would cron this; exposed as an on-demand admin action here since
// there's no cron infrastructure in this MVP (P1-3's delivery worker is the
// closest analog — an in-process interval, not a real scheduler).

const DEFAULT_RETENTION_DAYS = 90;

router.post("/v1/admin/webhook-events/purge", async (req, res): Promise<void> => {
  const parsed = PurgeAdminWebhookEventsBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const retentionDays = parsed.data.olderThanDays ?? DEFAULT_RETENTION_DAYS;
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const deleted = await db
    .delete(webhookEventsTable)
    .where(and(inArray(webhookEventsTable.status, ["delivered", "failed"]), lt(webhookEventsTable.createdAt, cutoff)))
    .returning();

  res.json(PurgeAdminWebhookEventsResponse.parse({ purged: deleted.length, retentionDays }));
});

export default router;