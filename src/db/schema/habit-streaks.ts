import {
  uuid,
  integer,
  date,
  timestamp,
  pgTable,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { habits } from "./habits";

export const habitStreaks = pgTable("habit_streaks", {
  id: uuid("id").primaryKey().defaultRandom(),
  habitId: uuid("habit_id")
    .unique()
    .notNull()
    .references(() => habits.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  currentStreak: integer("current_streak").default(0),
  longestStreak: integer("longest_streak").default(0),
  lastCompletedDate: date("last_completed_date"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).default(
    sql`now()`
  ),
});
