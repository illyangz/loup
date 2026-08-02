import webpush from "web-push";
import { eq, ne, inArray } from "drizzle-orm";
import {
  db,
  membersTable,
  pushConfigTable,
  pushSubscriptionsTable,
} from "@workspace/db";
import { logger } from "./logger";

// VAPID keys are generated once and persisted so subscriptions stay valid
// across restarts without any manual setup.
let vapidReady: Promise<{ publicKey: string; privateKey: string }> | null =
  null;

export function getVapidKeys(): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  if (!vapidReady) {
    vapidReady = (async () => {
      const [existing] = await db.select().from(pushConfigTable).limit(1);
      let keys = existing;
      if (!keys) {
        const generated = webpush.generateVAPIDKeys();
        const [inserted] = await db
          .insert(pushConfigTable)
          .values({
            publicKey: generated.publicKey,
            privateKey: generated.privateKey,
          })
          .returning();
        keys = inserted!;
      }
      webpush.setVapidDetails(
        "mailto:loup@example.com",
        keys.publicKey,
        keys.privateKey,
      );
      return { publicKey: keys.publicKey, privateKey: keys.privateKey };
    })().catch((err) => {
      vapidReady = null; // allow retry on next call
      throw err;
    });
  }
  return vapidReady;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

async function sendToSubscriptions(
  subs: Array<typeof pushSubscriptionsTable.$inferSelect>,
  payload: PushPayload,
): Promise<void> {
  if (subs.length === 0) return;
  await getVapidKeys();
  const data = JSON.stringify(payload);
  const stale: number[] = [];
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          data,
        );
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          stale.push(sub.id); // endpoint gone — clean it up
        } else {
          logger.warn({ err, endpoint: sub.endpoint }, "Web push failed");
        }
      }
    }),
  );
  if (stale.length > 0) {
    await db
      .delete(pushSubscriptionsTable)
      .where(inArray(pushSubscriptionsTable.id, stale));
  }
}

/** Notify every subscribed member of the household except the sender. */
export async function notifyHousehold(
  householdId: number,
  excludeMemberId: number | null,
  payload: PushPayload,
): Promise<void> {
  try {
    const rows = await db
      .select({ sub: pushSubscriptionsTable })
      .from(pushSubscriptionsTable)
      .innerJoin(
        membersTable,
        eq(pushSubscriptionsTable.memberId, membersTable.id),
      )
      .where(
        excludeMemberId == null
          ? eq(membersTable.householdId, householdId)
          : // drizzle lacks a simple and() import here; filter in JS below
            eq(membersTable.householdId, householdId),
      );
    const subs = rows
      .map((r) => r.sub)
      .filter((s) => excludeMemberId == null || s.memberId !== excludeMemberId);
    await sendToSubscriptions(subs, payload);
  } catch (err) {
    logger.error({ err, householdId }, "notifyHousehold failed");
  }
}

/** Notify the head(s) of the household (excluding an optional member). */
export async function notifyHouseholdHeads(
  householdId: number,
  excludeMemberId: number | null,
  payload: PushPayload,
): Promise<void> {
  try {
    const rows = await db
      .select({ sub: pushSubscriptionsTable, role: membersTable.role })
      .from(pushSubscriptionsTable)
      .innerJoin(
        membersTable,
        eq(pushSubscriptionsTable.memberId, membersTable.id),
      )
      .where(eq(membersTable.householdId, householdId));
    const subs = rows
      .filter(
        (r) =>
          r.role === "head" &&
          (excludeMemberId == null || r.sub.memberId !== excludeMemberId),
      )
      .map((r) => r.sub);
    await sendToSubscriptions(subs, payload);
  } catch (err) {
    logger.error({ err, householdId }, "notifyHouseholdHeads failed");
  }
}

/** Notify a specific member's devices. */
export async function notifyMember(
  memberId: number,
  payload: PushPayload,
): Promise<void> {
  try {
    const subs = await db
      .select()
      .from(pushSubscriptionsTable)
      .where(eq(pushSubscriptionsTable.memberId, memberId));
    await sendToSubscriptions(subs, payload);
  } catch (err) {
    logger.error({ err, memberId }, "notifyMember failed");
  }
}
