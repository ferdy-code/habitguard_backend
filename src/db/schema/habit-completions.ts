import {
  uuid,
  integer,
  text,
  date,
  timestamp,
  unique,
  index,
  pgTable,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { habits } from "./habits";

export const habitCompletions = pgTable(
  "habit_completions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    habitId: uuid("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    completedDate: date("completed_date").notNull(),
    count: integer("count").default(1),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).default(
      sql`now()`
    ),
  },
  (table) => [
    unique("habit_completions_habit_id_completed_date_unique").on(
      table.habitId,
      table.completedDate
    ),
    index("idx_habit_completions_user_date").on(table.userId, table.completedDate),
    index("idx_habit_completions_habit_date").on(table.habitId, table.completedDate),
  ]
);
