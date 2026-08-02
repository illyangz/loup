import {
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { householdsTable, membersTable, addressesTable } from "./household";
import { providersTable, servicesTable } from "./catalog";

export const bookingsTable = pgTable("bookings", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id")
    .notNull()
    .references(() => householdsTable.id),
  providerId: integer("provider_id")
    .notNull()
    .references(() => providersTable.id),
  serviceId: integer("service_id")
    .notNull()
    .references(() => servicesTable.id),
  memberId: integer("member_id")
    .notNull()
    .references(() => membersTable.id),
  addressId: integer("address_id")
    .notNull()
    .references(() => addressesTable.id),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  // pending | confirmed | en_route | arrived | in_progress | completed | cancelled
  status: text("status").notNull().default("pending"),
  priceEstimate: doublePrecision("price_estimate").notNull(),
  instructions: text("instructions"),
  etaMinutes: integer("eta_minutes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const bookingEventsTable = pgTable("booking_events", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .notNull()
    .references(() => bookingsTable.id),
  status: text("status").notNull(),
  note: text("note").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id")
    .notNull()
    .references(() => bookingsTable.id),
  sender: text("sender").notNull(), // member | provider
  senderName: text("sender_name").notNull(),
  body: text("body").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookingsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type BookingRow = typeof bookingsTable.$inferSelect;

export const insertBookingEventSchema = createInsertSchema(
  bookingEventsTable,
).omit({ id: true });
export type InsertBookingEvent = z.infer<typeof insertBookingEventSchema>;
export type BookingEventRow = typeof bookingEventsTable.$inferSelect;

export const insertMessageSchema = createInsertSchema(messagesTable).omit({
  id: true,
});
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type MessageRow = typeof messagesTable.$inferSelect;
