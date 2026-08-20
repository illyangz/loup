import { eq } from "drizzle-orm";
import { db, idempotencyRecordsTable } from "@workspace/db";
import type { NextFunction, Request, Response } from "express";

// ─── Idempotency-Key enforcement (P1-4) ──────────────────────────────────────
// Money-writing POST endpoints (create booking, pay statement, approve a
// household service request) accept an optional `Idempotency-Key` header. When
// present, a repeat request with the same key replays the first response
// instead of re-executing the handler — this is what prevents a client retry
// or double-click from creating a duplicate booking, duplicate payment, or
// duplicate ledger entry (brief §9's duplicate-redemption requirement).
//
// The key is reserved (a placeholder row, statusCode 0) before the handler
// runs, so a second request arriving while the first is still in flight polls
// for the real result instead of re-running the handler concurrently.
//
// Every idempotency-record write here is fully awaited *before* any response
// reaches the client (the response itself is held back until the settle write
// completes), rather than fire-and-forget — so a reservation can never be left
// dangling after the client has already moved on and possibly retried.

const IDEMPOTENCY_HEADER = "idempotency-key";
const RESERVED_STATUS = 0;
const POLL_INTERVAL_MS = 50;
const POLL_ATTEMPTS = 40; // ~2s worst case

function getKey(req: Request): string | null {
  const raw = req.headers[IDEMPOTENCY_HEADER];
  const key = Array.isArray(raw) ? raw[0] : raw;
  return typeof key === "string" && key.trim() !== "" ? key.trim() : null;
}

/**
 * Wraps a route handler so a request carrying an `Idempotency-Key` header is
 * only ever processed once. `endpointName` identifies the logical operation
 * (e.g. "POST /bookings") — reusing a key against a different operation is a
 * client error, not a replay. Without the header, behaves exactly like the
 * unwrapped handler (fully backward compatible).
 */
export function withIdempotency(
  endpointName: string,
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void> | void,
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = getKey(req);
    if (!key) {
      await handler(req, res, next);
      return;
    }

    const [existing] = await db.select().from(idempotencyRecordsTable).where(eq(idempotencyRecordsTable.key, key));
    if (existing) {
      if (existing.endpoint !== endpointName) {
        res.status(409).json({ error: "Idempotency-Key was already used for a different operation" });
        return;
      }
      if (existing.statusCode === RESERVED_STATUS) {
        const replay = await waitForResult(key);
        if (!replay) {
          res.status(409).json({ error: "Request with this Idempotency-Key is still processing" });
          return;
        }
        res.status(replay.statusCode).json(replay.responseBody);
        return;
      }
      res.status(existing.statusCode).json(existing.responseBody);
      return;
    }

    try {
      await db.insert(idempotencyRecordsTable).values({ key, endpoint: endpointName, statusCode: RESERVED_STATUS, responseBody: {} });
    } catch {
      // Unique violation: a concurrent request already reserved this key.
      const replay = await waitForResult(key);
      if (!replay) {
        res.status(409).json({ error: "Request with this Idempotency-Key is still processing" });
        return;
      }
      res.status(replay.statusCode).json(replay.responseBody);
      return;
    }

    // Hold the real response back until the settle write completes — see the
    // file header for why this must never be fire-and-forget.
    let jsonBody: unknown;
    let sawJson = false;
    const originalJson = res.json.bind(res);
    res.json = ((body: unknown): Response => {
      jsonBody = body;
      sawJson = true;
      return res;
    }) as typeof res.json;

    try {
      await handler(req, res, next);
      if (sawJson) {
        await db
          .update(idempotencyRecordsTable)
          .set({ statusCode: res.statusCode, responseBody: (jsonBody ?? {}) as object })
          .where(eq(idempotencyRecordsTable.key, key));
        originalJson(jsonBody);
      } else {
        // Handler responded some other way (or delegated via next()) — nothing
        // JSON to replay later, so release the reservation rather than leave
        // a permanently "in progress" record for the next attempt.
        await db.delete(idempotencyRecordsTable).where(eq(idempotencyRecordsTable.key, key));
      }
    } catch (err) {
      await db.delete(idempotencyRecordsTable).where(eq(idempotencyRecordsTable.key, key));
      throw err;
    }
  };
}

async function waitForResult(key: string): Promise<{ statusCode: number; responseBody: unknown } | null> {
  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const [row] = await db.select().from(idempotencyRecordsTable).where(eq(idempotencyRecordsTable.key, key));
    if (row && row.statusCode !== RESERVED_STATUS) {
      return { statusCode: row.statusCode, responseBody: row.responseBody };
    }
  }
  return null;
}
