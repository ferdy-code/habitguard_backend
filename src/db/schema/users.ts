import {
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  pgTable,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  avatarUrl: text("avatar_url"),
  timezone: varchar("timezone", { length: 50 }).default("Asia/Jakarta"),
  dailyScreenLimitMinutes: integer("daily_screen_limit_minutes").default(180),
  notificationEnabled: boolean("notification_enabled").default(true),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).default(
    sql`now()`
  ),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(
    sql`now()`
  ),
});
