import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import {
  db,
  bookingEventsTable,
  bookingStatusHistoryTable,
  bookingsTable,
  allowanceLedgerTable,
  employeesTable,
  messagesTable,
  reviewsTable,
  servicesTable,
} from "@workspace/db";
import {
  AdvanceBookingParams,
  AdvanceBookingResponse,
  CreateBookingBody,
  CreateBookingResponse,
  GetBookingParams,
  GetBookingResponse,
  ListBookingMessagesParams,
  ListBookingMessagesResponse,
  ListBookingsQueryParams,
  ListBookingsResponse,
  SendBookingMessageBody,
  SendBookingMessageParams,
  SendBookingMessageResponse,
  UpdateBookingBody,
  UpdateBookingParams,
  UpdateBookingResponse,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";
import {
  STATUS_CHAIN,
  addCompletionBillItem,
  fetchBookingView,
  fetchBookingViews,
  getCurrentMember,
} from "../lib/loup";

const router: IRouter = Router();

const SCOPE_STATUSES: Record<string, string[]> = {
  active: ["en_route", "arrived", "in_progress"],
  upcoming: ["pending", "confirmed"],
  past: ["completed", "cancelled"],
};

router.get("/bookings", async (req, res): Promise<void> => {
  const query = ListBookingsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const scope = query.data.scope ?? "all";
  const statuses = SCOPE_STATUSES[scope];
  const rows = await fetchBookingViews({
    statuses,
    order: scope === "past" || scope === "all" ? "desc" : "asc",
  });
  res.json(ListBookingsResponse.parse(rows));
});

router.post("/bookings", async (req, res): Promise<void> => {
  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { serviceId, addressId, scheduledAt, instructions, allowanceContribution } = parsed.data;

  const [service] = await db
    .select()
    .from(servicesTable)
    .where(eq(servicesTable.id, serviceId));
  if (!service) {
    res.status(400).json({ error: "Service not found" });
    return;
  }
  const member = await getCurrentMember();
  if (!member) {
    res.status(500).json({ error: "No household data seeded" });
    return;
  }

  const [booking] = await db
    .insert(bookingsTable)
    .values({
      householdId: member.householdId,
      providerId: service.providerId,
      serviceId: service.id,
      memberId: member.id,
      addressId,
      scheduledAt,
      status: "pending",
      priceEstimate: service.price,
      instructions: instructions ?? null,
    })
    .returning();

  await db.insert(bookingEventsTable).values({
    bookingId: booking!.id,
    status: "pending",
    note: "Booking placed — waiting for the provider to accept",
    occurredAt: new Date(),
  });

  // Write status history row for audit trail
  await db.insert(bookingStatusHistoryTable).values({
    bookingId: booking!.id,
    fromStatus: null,
    toStatus: "pending",
    actorRole: "employee",
    note: "Booking placed by employee",
  });

  // If the employee applied allowance, write a reserved ledger entry
  const contribution = allowanceContribution ?? 0;
  if (contribution > 0) {
    const [employeeRow] = await db
      .select({ id: employeesTable.id, employerId: employeesTable.employerId })
      .from(employeesTable)
      .where(eq(employeesTable.linkedMemberId, member.id));
    if (employeeRow) {
      await db.insert(allowanceLedgerTable).values({
        employerId: employeeRow.employerId,
        employeeId: employeeRow.id,
        entryType: "reserved",
        amount: contribution,
        referenceType: "booking",
        referenceId: booking!.id,
        note: `Allowance reserved for booking #${booking!.id}`,
        createdByRole: "employee",
      });
    }
  }

  // Providers accept quickly on Loup: auto-confirm shortly after placement.
  const bookingId = booking!.id;
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
        const view = await fetchBookingView(bookingId);
        await db.insert(bookingEventsTable).values({
          bookingId,
          status: "confirmed",
          note: `${view?.providerName ?? "The provider"} accepted the job`,
          occurredAt: new Date(),
        });
      }
    } catch (err) {
      logger.error({ err, bookingId }, "Auto-confirm failed");
    }
  }, 7000);

  const view = await fetchBookingView(bookingId);
  req.log.info({ bookingId }, "Booking created");
  res.status(201).json(CreateBookingResponse.parse(view));
});

async function bookingDetail(id: number) {
  const view = await fetchBookingView(id);
  if (!view) {
    return undefined;
  }
  const events = await db
    .select()
    .from(bookingEventsTable)
    .where(eq(bookingEventsTable.bookingId, id))
    .orderBy(asc(bookingEventsTable.occurredAt));
  const reviews = await db
    .select({ id: reviewsTable.id })
    .from(reviewsTable)
    .where(eq(reviewsTable.bookingId, id));
  return { ...view, events, hasReview: reviews.length > 0 };
}

router.get("/bookings/:id", async (req, res): Promise<void> => {
  const params = GetBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const detail = await bookingDetail(params.data.id);
  if (!detail) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  res.json(GetBookingResponse.parse(detail));
});

router.patch("/bookings/:id", async (req, res): Promise<void> => {
  const params = UpdateBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [booking] = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.id, params.data.id));
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  if (booking.status === "completed" || booking.status === "cancelled") {
    res.status(400).json({ error: "This booking can no longer be changed" });
    return;
  }

  const { scheduledAt, status } = parsed.data;
  if (status === "cancelled") {
    await db
      .update(bookingsTable)
      .set({ status: "cancelled", etaMinutes: null })
      .where(eq(bookingsTable.id, booking.id));
    await db.insert(bookingEventsTable).values({
      bookingId: booking.id,
      status: "cancelled",
      note: "Booking cancelled by the household",
      occurredAt: new Date(),
    });
  } else if (scheduledAt) {
    await db
      .update(bookingsTable)
      .set({ scheduledAt })
      .where(eq(bookingsTable.id, booking.id));
    await db.insert(bookingEventsTable).values({
      bookingId: booking.id,
      status: booking.status,
      note: "Booking rescheduled by the household",
      occurredAt: new Date(),
    });
  } else {
    res.status(400).json({ error: "Nothing to update" });
    return;
  }

  const view = await fetchBookingView(booking.id);
  res.json(UpdateBookingResponse.parse(view));
});

router.post("/bookings/:id/advance", async (req, res): Promise<void> => {
  const params = AdvanceBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [booking] = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.id, params.data.id));
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  const index = STATUS_CHAIN.indexOf(
    booking.status as (typeof STATUS_CHAIN)[number],
  );
  if (index === -1 || index === STATUS_CHAIN.length - 1) {
    res.status(400).json({ error: "This booking cannot advance further" });
    return;
  }
  const next = STATUS_CHAIN[index + 1]!;
  const view = await fetchBookingView(booking.id);

  const etaByStatus: Record<string, number | null> = {
    confirmed: null,
    en_route: 15,
    arrived: null,
    in_progress: null,
    completed: null,
  };
  const noteByStatus: Record<string, string> = {
    confirmed: `${view?.providerName ?? "The provider"} accepted the job`,
    en_route: `${view?.providerName ?? "The provider"} is on the way to ${view?.addressLabel ?? "your address"}`,
    arrived: `Provider arrived at ${view?.addressLabel ?? "your address"}`,
    in_progress: "Work has started",
    completed: `Job completed — AED ${booking.priceEstimate} added to the household bill`,
  };

  await db
    .update(bookingsTable)
    .set({ status: next, etaMinutes: etaByStatus[next] ?? null })
    .where(eq(bookingsTable.id, booking.id));
  await db.insert(bookingEventsTable).values({
    bookingId: booking.id,
    status: next,
    note: noteByStatus[next] ?? "Status updated",
    occurredAt: new Date(),
  });

  if (next === "completed") {
    await addCompletionBillItem({
      id: booking.id,
      householdId: booking.householdId,
      priceEstimate: booking.priceEstimate,
    });
  }

  const detail = await bookingDetail(booking.id);
  req.log.info({ bookingId: booking.id, status: next }, "Booking advanced");
  res.json(AdvanceBookingResponse.parse(detail));
});

const AUTO_REPLIES = [
  "On it — thanks for the details.",
  "Noted, we will be ready for that.",
  "Perfect, see you at the scheduled time.",
  "Understood. Anything else, just message me here.",
];

router.get("/bookings/:id/messages", async (req, res): Promise<void> => {
  const params = ListBookingMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const rows = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.bookingId, params.data.id))
    .orderBy(asc(messagesTable.sentAt));
  res.json(ListBookingMessagesResponse.parse(rows));
});

router.post("/bookings/:id/messages", async (req, res): Promise<void> => {
  const params = SendBookingMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = SendBookingMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const view = await fetchBookingView(params.data.id);
  if (!view) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  const member = await getCurrentMember();
  const [message] = await db
    .insert(messagesTable)
    .values({
      bookingId: view.id,
      sender: "member",
      senderName: member?.name ?? "You",
      body: parsed.data.body,
      sentAt: new Date(),
    })
    .returning();

  // The provider answers a few seconds later so the chat feels alive.
  const bookingId = view.id;
  const providerName = view.providerName;
  const replySeed = message!.id;
  setTimeout(async () => {
    try {
      await db.insert(messagesTable).values({
        bookingId,
        sender: "provider",
        senderName: providerName,
        body: AUTO_REPLIES[replySeed % AUTO_REPLIES.length]!,
        sentAt: new Date(),
      });
    } catch (err) {
      logger.error({ err, bookingId }, "Auto-reply failed");
    }
  }, 3000);

  res.status(201).json(SendBookingMessageResponse.parse(message));
});

export default router;
