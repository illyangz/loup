import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { householdsTable, membersTable } from "./household";
import { bookingsTable } from "./bookings";
import { servicesTable } from "./catalog";

// Household-internal "Pack" thread, separate from provider chat.
export const packMessagesTable = pgTable("pack_messages", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id")
    .notNull()
    .references(() => householdsTable.id),
  memberId: integer("member_id")
    .notNull()
    .references(() => membersTable.id),
  body: text("body").notNull(),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
});

// Service requests from members, reviewed by the head of household.
export const serviceRequestsTable = pgTable("service_requests", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id")
    .notNull()
    .references(() => householdsTable.id),
  memberId: integer("member_id")
    .notNull()
    .references(() => membersTable.id),
  serviceId: integer("service_id")
    .notNull()
    .references(() => servicesTable.id),
  note: text("note").notNull(),
  // pending | approved | declined
  status: text("status").notNull().default("pending"),
  bookingId: integer("booking_id").references(() => bookingsTable.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
});

export const insertPackMessageSchema = createInsertSchema(
  packMessagesTable,
).omit({ id: true });
export type InsertPackMessage = z.infer<typeof insertPackMessageSchema>;
export type PackMessageRow = typeof packMessagesTable.$inferSelect;

export const insertServiceRequestSchema = createInsertSchema(
  serviceRequestsTable,
).omit({ id: true });
export type InsertServiceRequest = z.infer<typeof insertServiceRequestSchema>;
export type ServiceRequestRow = typeof serviceRequestsTable.$inferSelect;
