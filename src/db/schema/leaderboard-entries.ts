import {
  uuid,
  varchar,
  integer,
  date,
  timestamp,
  index,
  pgEnum,
  pgTable,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { friendGroups } from "./friend-groups";

export const periodTypeEnum = pgEnum("period_type", ["weekly", "monthly"]);

export const leaderboardEntries = pgTable(
  "leaderboard_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    groupId: uuid("group_id").references(() => friendGroups.id, {
      onDelete: "cascade",
    }),
    periodType: periodTypeEnum("period_type").notNull(),
    periodStart: date("period_start").notNull(),
    score: integer("score").default(0),
    habitPoints: integer("habit_points").default(0),
    screenTimePoints: integer("screen_time_points").default(0),
    streakBonus: integer("streak_bonus").default(0),
    focusPoints: integer("focus_points").default(0),
    rank: integer("rank"),
    createdAt: timestamp("created_at", { withTimezone: true }).default(
      sql`now()`
    ),
  },
  (table) => [
    index("idx_leaderboard_period").on(
      table.periodType,
      table.periodStart,
      table.score
    ),
    index("idx_leaderboard_group").on(
      table.groupId,
      table.periodType,
      table.periodStart
    ),
  ]
);
