import {
  uuid,
  integer,
  text,
  date,
  numeric,
  timestamp,
  unique,
  index,
  pgTable,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const dailySummaries = pgTable(
  "daily_summaries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    summaryDate: date("summary_date").notNull(),
    totalScreenMinutes: integer("total_screen_minutes").default(0),
    habitsCompleted: integer("habits_completed").default(0),
    habitsTotal: integer("habits_total").default(0),
    completionRate: numeric("completion_rate", {
      precision: 5,
      scale: 2,
    }).default("0.00"),
    focusMinutes: integer("focus_minutes").default(0),
    aiInsight: text("ai_insight"),
    aiGeneratedAt: timestamp("ai_generated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).default(
      sql`now()`
    ),
  },
  (table) => [
    unique("daily_summaries_user_id_summary_date_unique").on(
      table.userId,
      table.summaryDate
    ),
    index("idx_daily_summaries_user_date").on(table.userId, table.summaryDate),
  ]
);
