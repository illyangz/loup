import { Router, type IRouter } from "express";
import { and, asc, desc, eq } from "drizzle-orm";
import {
  db,
  addressesTable,
  bookingEventsTable,
  bookingsTable,
  categoriesTable,
  membersTable,
  packMessagesTable,
  providersTable,
  serviceRequestsTable,
  servicesTable,
} from "@workspace/db";
import {
  ApproveServiceRequestParams,
  CreateServiceRequestBody,
  CreateServiceRequestResponse,
  DeclineServiceRequestParams,
  ListPackMessagesResponse,
  ListServiceRequestsResponse,
  SendPackMessageBody,
  SendPackMessageResponse,
  ApproveServiceRequestResponse,
  DeclineServiceRequestResponse,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";
import {
  fetchPackMessages,
  fetchServiceRequests,
  getCurrentMember,
  postPackMessage,
} from "../lib/loup";
import { notifyHousehold, notifyHouseholdHeads } from "../lib/push";

const router: IRouter = Router();

// Rotating replies so the family thread feels alive in the demo.
const PACK_AUTO_REPLIES: Array<{ memberName: string; body: string }> = [
  { memberName: "Layla Mansour", body: "Sounds good — I'll be home by then." },
  { memberName: "Zayd Mansour", body: "Okay okay, noted 😄" },
  { memberName: "Rosa Dela Cruz", body: "Noted, I will keep the side gate open for them." },
  { memberName: "Amira Mansour", body: "Can we do it after my class? 🙏" },
];

router.get("/pack/messages", async (_req, res): Promise<void> => {
  const member = await getCurrentMember();
  if (!member) {
    res.status(500).json({ error: "No household data seeded" });
    return;
  }
  const rows = await fetchPackMessages(member.householdId);
  // Opening the thread marks it read for the current member.
  await db
    .update(membersTable)
    .set({ packLastReadAt: new Date() })
    .where(eq(membersTable.id, member.id));
  res.json(ListPackMessagesResponse.parse(rows));
});

router.post("/pack/messages", async (req, res): Promise<void> => {
  const parsed = SendPackMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const member = await getCurrentMember();
  if (!member) {
    res.status(500).json({ error: "No household data seeded" });
    return;
  }
  const message = await postPackMessage(member.householdId, member.id, parsed.data.body);
  // Alert other subscribed household members about the new message.
  void notifyHousehold(member.householdId, member.id, {
    title: `${member.name} · Pack`,
    body: parsed.data.body,
    url: "/household",
    tag: "pack-message",
  });
  await db
    .update(membersTable)
    .set({ packLastReadAt: new Date() })
    .where(eq(membersTable.id, member.id));

  // A family member chimes in a few seconds later so the thread feels alive.
  const householdId = member.householdId;
  const replySeed = message.id;
  setTimeout(async () => {
    try {
      const reply = PACK_AUTO_REPLIES[replySeed % PACK_AUTO_REPLIES.length]!;
      const [replier] = await db
        .select()
        .from(membersTable)
        .where(eq(membersTable.name, reply.memberName));
      if (replier && replier.id !== member.id) {
        await db.insert(packMessagesTable).values({
          householdId,
          memberId: replier.id,
          body: reply.body,
          sentAt: new Date(),
        });
        // Alert everyone else (including the original sender's devices).
        void notifyHousehold(householdId, replier.id, {
          title: `${replier.name} · Pack`,
          body: reply.body,
          url: "/household",
          tag: "pack-message",
        });
      }
    } catch (err) {
      logger.error({ err, householdId }, "Pack auto-reply failed");
    }
  }, 4000);

  res.status(201).json(
    SendPackMessageResponse.parse({
      id: message.id,
      memberId: member.id,
      memberName: member.name,
      initials: member.initials,
      isCurrentUser: true,
      body: message.body,
      sentAt: message.sentAt,
    }),
  );
});

router.get("/pack/requests", async (_req, res): Promise<void> => {
  const member = await getCurrentMember();
  if (!member) {
    res.status(500).json({ error: "No household data seeded" });
    return;
  }
  const rows = await fetchServiceRequests(member.householdId);
  res.json(ListServiceRequestsResponse.parse(rows));
});

router.post("/pack/requests", async (req, res): Promise<void> => {
  const parsed = CreateServiceRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const member = await getCurrentMember();
  if (!member) {
    res.status(500).json({ error: "No household data seeded" });
    return;
  }
  const [service] = await db
    .select()
    .from(servicesTable)
    .where(eq(servicesTable.id, parsed.data.serviceId));
  if (!service) {
    res.status(400).json({ error: "Service not found" });
    return;
  }
  const [request] = await db
    .insert(serviceRequestsTable)
    .values({
      householdId: member.householdId,
      memberId: member.id,
      serviceId: service.id,
      note: parsed.data.note,
      status: "pending",
      createdAt: new Date(),
    })
    .returning();

  const rows = await fetchServiceRequests(member.householdId);
  const view = rows.find((r) => r.id === request!.id);
  req.log.info({ requestId: request!.id }, "Service request created");
  // Alert the head of household that a request needs their approval.
  void notifyHouseholdHeads(member.householdId, member.id, {
    title: "Approval needed",
    body: `${member.name} requested ${service.name}`,
    url: "/household",
    tag: "service-request",
  });
  res.status(201).json(CreateServiceRequestResponse.parse(view));
});

// Only the head of household may decide requests,
// and only requests belonging to their own household.
async function getApproverAndRequest(
  requestId: number,
): Promise<
  | { error: { status: number; message: string } }
  | {
      approver: NonNullable<Awaited<ReturnType<typeof getCurrentMember>>>;
      request: typeof serviceRequestsTable.$inferSelect;
    }
> {
  const approver = await getCurrentMember();
  if (!approver) {
    return { error: { status: 500, message: "No household data seeded" } };
  }
  if (approver.role !== "head") {
    return {
      error: {
        status: 403,
        message: "Only the head of household can decide requests",
      },
    };
  }
  const [request] = await db
    .select()
    .from(serviceRequestsTable)
    .where(
      and(
        eq(serviceRequestsTable.id, requestId),
        eq(serviceRequestsTable.householdId, approver.householdId),
      ),
    );
  if (!request) {
    return { error: { status: 404, message: "Request not found" } };
  }
  return { approver, request };
}

// Atomically claim a pending request so concurrent decisions can't double-book.
async function claimPendingRequest(
  requestId: number,
  householdId: number,
  set: Partial<typeof serviceRequestsTable.$inferInsert>,
): Promise<boolean> {
  const updated = await db
    .update(serviceRequestsTable)
    .set(set)
    .where(
      and(
        eq(serviceRequestsTable.id, requestId),
        eq(serviceRequestsTable.householdId, householdId),
        eq(serviceRequestsTable.status, "pending"),
      ),
    )
    .returning({ id: serviceRequestsTable.id });
  return updated.length > 0;
}

router.post("/pack/requests/:id/approve", async (req, res): Promise<void> => {
  const params = ApproveServiceRequestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const result = await getApproverAndRequest(params.data.id);
  if ("error" in result) {
    res.status(result.error.status).json({ error: result.error.message });
    return;
  }
  const { approver, request } = result;
  if (request.status !== "pending") {
    res.status(400).json({ error: "This request has already been decided" });
    return;
  }
  const [service] = await db
    .select()
    .from(servicesTable)
    .where(eq(servicesTable.id, request.serviceId));
  const [provider] = service
    ? await db
        .select()
        .from(providersTable)
        .where(eq(providersTable.id, service.providerId))
    : [];
  const [requester] = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.id, request.memberId));
  const [address] = await db
    .select()
    .from(addressesTable)
    .where(eq(addressesTable.householdId, request.householdId))
    .orderBy(asc(addressesTable.id))
    .limit(1);
  if (!service || !address || !requester) {
    res.status(400).json({ error: "Request can no longer be booked" });
    return;
  }

  // Atomically claim the request so concurrent approvals can't double-book.
  const claimed = await claimPendingRequest(request.id, request.householdId, {
    status: "approved",
    decidedAt: new Date(),
  });
  if (!claimed) {
    res.status(400).json({ error: "This request has already been decided" });
    return;
  }

  // Book for tomorrow morning by default; the household can reschedule.
  const scheduledAt = new Date();
  scheduledAt.setDate(scheduledAt.getDate() + 1);
  scheduledAt.setHours(10, 0, 0, 0);

  const [booking] = await db
    .insert(bookingsTable)
    .values({
      householdId: request.householdId,
      providerId: service.providerId,
      serviceId: service.id,
      memberId: requester.id,
      addressId: address.id,
      scheduledAt,
      status: "pending",
      priceEstimate: service.price,
      instructions: request.note,
    })
    .returning();
  await db.insert(bookingEventsTable).values({
    bookingId: booking!.id,
    status: "pending",
    note: `Booked from ${requester.name.split(" ")[0]}'s request — waiting for the provider to accept`,
    occurredAt: new Date(),
  });

  // Providers accept quickly on Loup: auto-confirm shortly after placement.
  const bookingId = booking!.id;
  const providerName = provider?.name ?? "The provider";
  setTimeout(async () => {
    try {
      const [current] = await db
        .select()
        .from(bookingsTable)
        .where(eq(bookingsTable.id, bookingId));
      if (current?.status === "pending") {
        await db
          .update(bookingsTable)
          .set({ status: "confirmed" })
          .where(eq(bookingsTable.id, bookingId));
        await db.insert(bookingEventsTable).values({
          bookingId,
          status: "confirmed",
          note: `${providerName} accepted the job`,
          occurredAt: new Date(),
        });
      }
    } catch (err) {
      logger.error({ err, bookingId }, "Auto-confirm failed");
    }
  }, 7000);

  await db
    .update(serviceRequestsTable)
    .set({ bookingId })
    .where(eq(serviceRequestsTable.id, request.id));

  // Tell the pack.
  await postPackMessage(
    request.householdId,
    approver.id,
    `Approved ${requester.name.split(" ")[0]}'s ${service.name} request — booked with ${providerName} for tomorrow 10:00 AM.`,
  );

  const rows = await fetchServiceRequests(request.householdId);
  const view = rows.find((r) => r.id === request.id);
  req.log.info({ requestId: request.id, bookingId }, "Service request approved");
  res.json(ApproveServiceRequestResponse.parse(view));
});

router.post("/pack/requests/:id/decline", async (req, res): Promise<void> => {
  const params = DeclineServiceRequestParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const result = await getApproverAndRequest(params.data.id);
  if ("error" in result) {
    res.status(result.error.status).json({ error: result.error.message });
    return;
  }
  const { approver, request } = result;
  const claimed = await claimPendingRequest(request.id, request.householdId, {
    status: "declined",
    decidedAt: new Date(),
  });
  if (!claimed) {
    res.status(400).json({ error: "This request has already been decided" });
    return;
  }

  const [requester] = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.id, request.memberId));
  const [service] = await db
    .select()
    .from(servicesTable)
    .where(eq(servicesTable.id, request.serviceId));
  if (requester && service) {
    await postPackMessage(
      request.householdId,
      approver.id,
      `Passed on ${requester.name.split(" ")[0]}'s ${service.name} request for now — let's revisit next week.`,
    );
  }

  const rows = await fetchServiceRequests(request.householdId);
  const view = rows.find((r) => r.id === request.id);
  req.log.info({ requestId: request.id }, "Service request declined");
  res.json(DeclineServiceRequestResponse.parse(view));
});

export default router;
