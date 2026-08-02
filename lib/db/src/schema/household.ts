import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const householdsTable = pgTable("households", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
});

export const membersTable = pgTable("members", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id")
    .notNull()
    .references(() => householdsTable.id),
  name: text("name").notNull(),
  relation: text("relation").notNull(),
  role: text("role").notNull(), // head | owner | member
  initials: text("initials").notNull(),
  monthlySpendLimit: doublePrecision("monthly_spend_limit"),
  isCurrentUser: boolean("is_current_user").notNull().default(false),
});

export const addressesTable = pgTable("addresses", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id")
    .notNull()
    .references(() => householdsTable.id),
  label: text("label").notNull(),
  area: text("area").notNull(),
  street: text("street").notNull(),
  instructions: text("instructions"),
});

export const insertHouseholdSchema = createInsertSchema(householdsTable).omit({
  id: true,
});
export type InsertHousehold = z.infer<typeof insertHouseholdSchema>;
export type HouseholdRow = typeof householdsTable.$inferSelect;

export const insertMemberSchema = createInsertSchema(membersTable).omit({
  id: true,
});
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type MemberRow = typeof membersTable.$inferSelect;

export const insertAddressSchema = createInsertSchema(addressesTable).omit({
  id: true,
});
export type InsertAddress = z.infer<typeof insertAddressSchema>;
export type AddressRow = typeof addressesTable.$inferSelect;
