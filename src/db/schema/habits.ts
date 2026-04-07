import {
  uuid,
  varchar,
  text,
  integer,
  boolean,
  time,
  timestamp,
  pgEnum,
  pgTable,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const frequencyEnum = pgEnum("frequency", ["daily", "weekly", "custom"]);

export const habits = pgTable("habits", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  icon: varchar("icon", { length: 50 }).default("\u2705"),
  color: varchar("color", { length: 7 }).default("#4CAF50"),
  frequency: frequencyEnum("frequency").notNull(),
  customDays: integer("custom_days").default(127),
  targetCount: integer("target_count").default(1),
  reminderTime: time("reminder_time"),
  reminderEnabled: boolean("reminder_enabled").default(false),
  category: varchar("category", { length: 50 }),
  isArchived: boolean("is_archived").default(false),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).default(
    sql`now()`
  ),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(
    sql`now()`
  ),
});
