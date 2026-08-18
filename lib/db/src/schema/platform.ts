import {
  boolean,
  date,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { membersTable } from "./household";
import { campusesTable, benefitTiersTable, benefitPlansTable, institutionsTable } from "./education";

export const employersTable = pgTable("employers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  country: text("country").notNull().default("AE"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const benefitProgramsTable = pgTable("benefit_programmes", {
  id: serial("id").primaryKey(),
  employerId: integer("employer_id")
    .notNull()
    .references(() => employersTable.id),
  name: text("name").notNull(),
  period: text("period").notNull().default("monthly"),
  allowanceAmount: doublePrecision("allowance_amount").notNull(),
  renewalDate: date("renewal_date", { mode: "string" }).notNull(),
  expirationPolicy: text("expiration_policy").notNull(),
  householdAccess: boolean("household_access").notNull().default(true),
  maxHouseholdMembers: integer("max_household_members").notNull().default(3),
  maxHouseholdAllocationPct: integer("max_household_allocation_pct")
    .notNull()
    .default(50),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const employeesTable = pgTable("employees", {
  id: serial("id").primaryKey(),
  employerId: integer("employer_id")
    .notNull()
    .references(() => employersTable.id),
  externalEmployeeId: text("external_employee_id").notNull(),
  name: text("name").notNull(),
  workEmail: text("work_email").notNull(),
  department: text("department").notNull(),
  benefitTier: text("benefit_tier").notNull(),
  eligibilityStatus: text("eligibility_status").notNull().default("eligible"),
  householdEligible: boolean("household_eligible").notNull().default(true),
  linkedMemberId: integer("linked_member_id").references(() => membersTable.id),
  startDate: date("start_date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }),
  // Education pivot: nullable FKs into the education hierarchy
  institutionId: integer("institution_id").references(() => institutionsTable.id),
  campusId: integer("campus_id").references(() => campusesTable.id),
  tierId: integer("tier_id").references(() => benefitTiersTable.id),
  /** JSONB: { allocations: [{ slug, name, amount }] } */
  allocationPrefs: jsonb("allocation_prefs"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const allowanceLedgerTable = pgTable("allowance_ledger", {
  id: serial("id").primaryKey(),
  employerId: integer("employer_id")
    .notNull()
    .references(() => employersTable.id),
  employeeId: integer("employee_id")
    .notNull()
    .references(() => employeesTable.id),
  entryType: text("entry_type").notNull(), // authorized | reserved | released | redeemed
  amount: doublePrecision("amount").notNull(),
  referenceType: text("reference_type"),
  referenceId: integer("reference_id"),
  note: text("note"),
  // Education pivot: nullable context columns (existing rows keep NULLs)
  institutionId: integer("institution_id").references(() => institutionsTable.id),
  benefitPlanId: integer("benefit_plan_id").references(() => benefitPlansTable.id),
  benefitTierId: integer("benefit_tier_id").references(() => benefitTiersTable.id),
  idempotencyKey: text("idempotency_key").unique(),
  createdByRole: text("created_by_role"), // employee | institution | admin | system
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const routinesTable = pgTable("routines", {
  id: serial("id").primaryKey(),
  memberId: integer("member_id")
    .notNull()
    .references(() => membersTable.id),
  categorySlug: text("category_slug").notNull(),
  label: text("label").notNull(),
  frequency: text("frequency").notNull(),
  preferredDay: text("preferred_day").notNull(),
  preferredTime: text("preferred_time").notNull(),
  maxCopayment: doublePrecision("max_copayment").notNull(),
  automaticReminder: boolean("automatic_reminder").notNull().default(true),
  manualConfirmation: boolean("manual_confirmation").notNull().default(true),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const auditEventsTable = pgTable("audit_events", {
  id: serial("id").primaryKey(),
  actorRole: text("actor_role").notNull(),
  actorId: text("actor_id").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertEmployerSchema = createInsertSchema(employersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertEmployer = z.infer<typeof insertEmployerSchema>;
export type EmployerRow = typeof employersTable.$inferSelect;

export const insertBenefitProgramSchema = createInsertSchema(
  benefitProgramsTable,
).omit({ id: true, createdAt: true });
export type InsertBenefitProgram = z.infer<typeof insertBenefitProgramSchema>;
export type BenefitProgramRow = typeof benefitProgramsTable.$inferSelect;

export const insertEmployeeSchema = createInsertSchema(employeesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type EmployeeRow = typeof employeesTable.$inferSelect;

export const insertAllowanceLedgerSchema = createInsertSchema(
  allowanceLedgerTable,
).omit({ id: true, createdAt: true });
export type InsertAllowanceLedger = z.infer<typeof insertAllowanceLedgerSchema>;
export type AllowanceLedgerRow = typeof allowanceLedgerTable.$inferSelect;

export const insertRoutineSchema = createInsertSchema(routinesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertRoutine = z.infer<typeof insertRoutineSchema>;
export type RoutineRow = typeof routinesTable.$inferSelect;

export const insertAuditEventSchema = createInsertSchema(auditEventsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertAuditEvent = z.infer<typeof insertAuditEventSchema>;
export type AuditEventRow = typeof auditEventsTable.$inferSelect;