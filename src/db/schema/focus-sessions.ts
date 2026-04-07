import {
  uuid,
  varchar,
  integer,
  text,
  timestamp,
  index,
  pgEnum,
  pgTable,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const sessionTypeEnum = pgEnum("session_type", [
  "pomodoro",
  "custom",
  "deep_focus",
]);

export const sessionStatusEnum = pgEnum("session_status", [
  "completed",
  "cancelled",
  "interrupted",
]);

export const focusSessions = pgTable(
  "focus_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    durationMinutes: integer("duration_minutes").notNull(),
    completedMinutes: integer("completed_minutes").notNull().default(0),
    sessionType: sessionTypeEnum("session_type").default("pomodoro"),
    status: sessionStatusEnum("status").default("completed"),
    blockedApps: text("blocked_apps").array(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).default(
      sql`now()`
    ),
  },
  (table) => [
    index("idx_focus_sessions_user_date").on(table.userId, table.startedAt),
  ]
);
