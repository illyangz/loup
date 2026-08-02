import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, pushSubscriptionsTable } from "@workspace/db";
import {
  GetPushPublicKeyResponse,
  SubscribePushBody,
  UnsubscribePushBody,
} from "@workspace/api-zod";
import { getCurrentMember } from "../lib/loup";
import { getVapidKeys } from "../lib/push";

const router: IRouter = Router();

router.get("/push/public-key", async (_req, res): Promise<void> => {
  const { publicKey } = await getVapidKeys();
  res.json(GetPushPublicKeyResponse.parse({ publicKey }));
});

router.post("/push/subscriptions", async (req, res): Promise<void> => {
  const parsed = SubscribePushBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const member = await getCurrentMember();
  if (!member) {
    res.status(500).json({ error: "No household data seeded" });
    return;
  }
  const { endpoint, keys } = parsed.data;
  await db
    .insert(pushSubscriptionsTable)
    .values({
      memberId: member.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    })
    .onConflictDoUpdate({
      target: pushSubscriptionsTable.endpoint,
      set: { memberId: member.id, p256dh: keys.p256dh, auth: keys.auth },
    });
  req.log.info({ memberId: member.id }, "Push subscription saved");
  res.status(201).json({ message: "Subscribed" });
});

router.post("/push/subscriptions/remove", async (req, res): Promise<void> => {
  const parsed = UnsubscribePushBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await db
    .delete(pushSubscriptionsTable)
    .where(eq(pushSubscriptionsTable.endpoint, parsed.data.endpoint));
  res.json({ message: "Unsubscribed" });
});

export default router;
