import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { count, desc, eq } from "drizzle-orm";
import { db, webhookEventsTable } from "@workspace/db";
import { requireRole } from "../lib/auth";

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

  res.json({
    events: events.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      payload: e.payload,
      status: e.status,
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
  });
});

export default router;