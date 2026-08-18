import {
  boolean,
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

// ─── Education hierarchy ───────────────────────────────────────────────────

export const educationGroupsTable = pgTable("education_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  country: text("country").notNull().default("AE"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const institutionsTable = pgTable("institutions", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").references(() => educationGroupsTable.id),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  /** school | university | college | nursery | vocational | training | management */
  type: text("type").notNull().default("school"),
  country: text("country").notNull().default("AE"),
  city: text("city").notNull().default("Dubai"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const campusesTable = pgTable("campuses", {
  id: serial("id").primaryKey(),
  institutionId: integer("institution_id").notNull().references(() => institutionsTable.id),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  city: text("city").notNull().default("Dubai"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const departmentsTable = pgTable("departments", {
  id: serial("id").primaryKey(),
  campusId: integer("campus_id").notNull().references(() => campusesTable.id),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Benefit plans & tiers ────────────────────────────────────────────────

export const benefitPlansTable = pgTable("benefit_plans", {
  id: serial("id").primaryKey(),
  institutionId: integer("institution_id").notNull().references(() => institutionsTable.id),
  name: text("name").notNull(),
  /** monthly | quarterly | annual */
  period: text("period").notNull().default("monthly"),
  renewalFrequency: text("renewal_frequency").notNull().default("monthly"),
  /** expires_at_period_end | never | rollover */
  expirationPolicy: text("expiration_policy").notNull().default("expires_at_period_end"),
  rolloverEnabled: boolean("rollover_enabled").notNull().default(false),
  rolloverMaxPct: integer("rollover_max_pct").notNull().default(0),
  householdAccess: boolean("household_access").notNull().default(false),
  topUpPermitted: boolean("top_up_permitted").notNull().default(true),
  permittedCategoryIds: jsonb("permitted_category_ids").$type<number[]>().notNull().default([]),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const benefitTiersTable = pgTable("benefit_tiers", {
  id: serial("id").primaryKey(),
  planId: integer("plan_id").notNull().references(() => benefitPlansTable.id),
  /** Faculty | Staff | Administrative */
  name: text("name").notNull(),
  monthlyAllowance: doublePrecision("monthly_allowance").notNull(),
  description: text("description").notNull().default(""),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Operational / tracking tables ────────────────────────────────────────

export const bookingStatusHistoryTable = pgTable("booking_status_history", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  /** employee | provider | institution | admin | system */
  actorRole: text("actor_role").notNull().default("system"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const supportIncidentsTable = pgTable("support_incidents", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id"),
  employeeId: integer("employee_id"),
  /** general | quality | billing | safety | other */
  category: text("category").notNull().default("general"),
  description: text("description").notNull(),
  /** open | investigating | resolved | closed */
  status: text("status").notNull().default("open"),
  resolution: text("resolution"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

export const supportIncidentNotesTable = pgTable("support_incident_notes", {
  id: serial("id").primaryKey(),
  incidentId: integer("incident_id").notNull().references(() => supportIncidentsTable.id),
  /** admin | system */
  authorRole: text("author_role").notNull().default("admin"),
  note: text("note").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const providerQualityFlagsTable = pgTable("provider_quality_flags", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id").notNull(),
  /** low_rating | high_cancellation | complaint_rate | incidents */
  flagType: text("flag_type").notNull(),
  threshold: doublePrecision("threshold").notNull(),
  currentValue: doublePrecision("current_value").notNull(),
  /** pending_review | under_review | resolved | dismissed */
  status: text("status").notNull().default("pending_review"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const webhookEventsTable = pgTable("webhook_events", {
  id: serial("id").primaryKey(),
  /** employee.activated | allowance.issued | booking.created | booking.completed | etc. */
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull().default({}),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  /** pending | delivered | failed */
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Insert schemas & types ───────────────────────────────────────────────

export const insertEducationGroupSchema = createInsertSchema(educationGroupsTable).omit({ id: true, createdAt: true });
export type InsertEducationGroup = z.infer<typeof insertEducationGroupSchema>;
export type EducationGroupRow = typeof educationGroupsTable.$inferSelect;

export const insertInstitutionSchema = createInsertSchema(institutionsTable).omit({ id: true, createdAt: true });
export type InsertInstitution = z.infer<typeof insertInstitutionSchema>;
export type InstitutionRow = typeof institutionsTable.$inferSelect;

export const insertCampusSchema = createInsertSchema(campusesTable).omit({ id: true, createdAt: true });
export type InsertCampus = z.infer<typeof insertCampusSchema>;
export type CampusRow = typeof campusesTable.$inferSelect;

export const insertDepartmentSchema = createInsertSchema(departmentsTable).omit({ id: true, createdAt: true });
export type InsertDepartment = z.infer<typeof insertDepartmentSchema>;
export type DepartmentRow = typeof departmentsTable.$inferSelect;

export const insertBenefitPlanSchema = createInsertSchema(benefitPlansTable).omit({ id: true, createdAt: true });
export type InsertBenefitPlan = z.infer<typeof insertBenefitPlanSchema>;
export type BenefitPlanRow = typeof benefitPlansTable.$inferSelect;

export const insertBenefitTierSchema = createInsertSchema(benefitTiersTable).omit({ id: true, createdAt: true });
export type InsertBenefitTier = z.infer<typeof insertBenefitTierSchema>;
export type BenefitTierRow = typeof benefitTiersTable.$inferSelect;

export const insertBookingStatusHistorySchema = createInsertSchema(bookingStatusHistoryTable).omit({ id: true, createdAt: true });
export type InsertBookingStatusHistory = z.infer<typeof insertBookingStatusHistorySchema>;
export type BookingStatusHistoryRow = typeof bookingStatusHistoryTable.$inferSelect;

export const insertSupportIncidentSchema = createInsertSchema(supportIncidentsTable).omit({ id: true, createdAt: true });
export type InsertSupportIncident = z.infer<typeof insertSupportIncidentSchema>;
export type SupportIncidentRow = typeof supportIncidentsTable.$inferSelect;

export const insertSupportIncidentNoteSchema = createInsertSchema(supportIncidentNotesTable).omit({ id: true, createdAt: true });
export type InsertSupportIncidentNote = z.infer<typeof insertSupportIncidentNoteSchema>;
export type SupportIncidentNoteRow = typeof supportIncidentNotesTable.$inferSelect;

export const insertProviderQualityFlagSchema = createInsertSchema(providerQualityFlagsTable).omit({ id: true, createdAt: true });
export type InsertProviderQualityFlag = z.infer<typeof insertProviderQualityFlagSchema>;
export type ProviderQualityFlagRow = typeof providerQualityFlagsTable.$inferSelect;

export const insertWebhookEventSchema = createInsertSchema(webhookEventsTable).omit({ id: true, createdAt: true });
export type InsertWebhookEvent = z.infer<typeof insertWebhookEventSchema>;
export type WebhookEventRow = typeof webhookEventsTable.$inferSelect;
