import {
  boolean,
  doublePrecision,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const categoriesTable = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  tagline: text("tagline").notNull(),
  icon: text("icon").notNull(),
  startingPrice: doublePrecision("starting_price").notNull(),
});

export const providersTable = pgTable("providers", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => categoriesTable.id),
  name: text("name").notNull(),
  tagline: text("tagline").notNull(),
  bio: text("bio").notNull(),
  rating: doublePrecision("rating").notNull(),
  reviewCount: integer("review_count").notNull().default(0),
  jobsCompleted: integer("jobs_completed").notNull().default(0),
  yearsOnPlatform: integer("years_on_platform").notNull().default(1),
  verified: boolean("verified").notNull().default(false),
  availableNow: boolean("available_now").notNull().default(false),
  responseMinutes: integer("response_minutes").notNull().default(30),
  startingPrice: doublePrecision("starting_price").notNull(),
  badges: text("badges").array().notNull().default([]),
});

export const servicesTable = pgTable("services", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id")
    .notNull()
    .references(() => providersTable.id),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: doublePrecision("price").notNull(),
  durationMinutes: integer("duration_minutes").notNull(),
});

export const reviewsTable = pgTable("reviews", {
  id: serial("id").primaryKey(),
  providerId: integer("provider_id")
    .notNull()
    .references(() => providersTable.id),
  bookingId: integer("booking_id"),
  authorName: text("author_name").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertCategorySchema = createInsertSchema(categoriesTable).omit({
  id: true,
});
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type CategoryRow = typeof categoriesTable.$inferSelect;

export const insertProviderSchema = createInsertSchema(providersTable).omit({
  id: true,
});
export type InsertProvider = z.infer<typeof insertProviderSchema>;
export type ProviderRow = typeof providersTable.$inferSelect;

export const insertServiceSchema = createInsertSchema(servicesTable).omit({
  id: true,
});
export type InsertService = z.infer<typeof insertServiceSchema>;
export type ServiceRow = typeof servicesTable.$inferSelect;

export const insertReviewSchema = createInsertSchema(reviewsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type ReviewRow = typeof reviewsTable.$inferSelect;
