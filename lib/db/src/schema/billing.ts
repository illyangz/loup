import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { householdsTable } from "./household";
import { bookingsTable } from "./bookings";

export const statementsTable = pgTable("statements", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id")
    .notNull()
    .references(() => householdsTable.id),
  monthLabel: text("month_label").notNull(), // e.g. "August 2026"
  status: text("status").notNull().default("open"), // open | paid
  // Stored totals; kept in sync when items are added / statement is paid.
  total: doublePrecision("total").notNull().default(0),
  itemCount: integer("item_count").notNull().default(0),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  paidWith: text("paid_with"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const billItemsTable = pgTable("bill_items", {
  id: serial("id").primaryKey(),
  statementId: integer("statement_id")
    .notNull()
    .references(() => statementsTable.id),
  bookingId: integer("booking_id")
    .notNull()
    .references(() => bookingsTable.id),
  amount: doublePrecision("amount").notNull(),
  date: timestamp("date", { withTimezone: true }).notNull(),
}, (t) => [
  uniqueIndex("bill_items_booking_id_unique").on(t.bookingId),
]);

export const paymentMethodsTable = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id")
    .notNull()
    .references(() => householdsTable.id),
  type: text("type").notNull(), // card | wallet | cash
  label: text("label").notNull(),
  detail: text("detail"),
  isDefault: boolean("is_default").notNull().default(false),
});

export const insertStatementSchema = createInsertSchema(statementsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertStatement = z.infer<typeof insertStatementSchema>;
export type StatementRow = typeof statementsTable.$inferSelect;

export const insertBillItemSchema = createInsertSchema(billItemsTable).omit({
  id: true,
});
export type InsertBillItem = z.infer<typeof insertBillItemSchema>;
export type BillItemRow = typeof billItemsTable.$inferSelect;

export const insertPaymentMethodSchema = createInsertSchema(
  paymentMethodsTable,
).omit({ id: true });
export type InsertPaymentMethod = z.infer<typeof insertPaymentMethodSchema>;
export type PaymentMethodRow = typeof paymentMethodsTable.$inferSelect;
