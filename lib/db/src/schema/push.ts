import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { membersTable } from "./household";

// Web Push subscriptions, one row per browser/device endpoint.
export const pushSubscriptionsTable = pgTable("push_subscriptions", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id")
    .notNull()
    .references(() => membersTable.id),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Single-row VAPID keypair, generated on first use so no manual setup is needed.
export const pushConfigTable = pgTable("push_config", {
  id: serial("id").primaryKey(),
  publicKey: text("public_key").notNull(),
  privateKey: text("private_key").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type PushSubscriptionRow = typeof pushSubscriptionsTable.$inferSelect;
export type PushConfigRow = typeof pushConfigTable.$inferSelect;
