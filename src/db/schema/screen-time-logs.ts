import {
  uuid,
  varchar,
  integer,
  date,
  timestamp,
  unique,
  index,
  pgTable,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const screenTimeLogs = pgTable(
  "screen_time_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    appPackageName: varchar("app_package_name", { length: 255 }).notNull(),
    appName: varchar("app_name", { length: 200 }),
    appCategory: varchar("app_category", { length: 50 }).default("other"),
    usageDate: date("usage_date").notNull(),
    usageMinutes: integer("usage_minutes").notNull().default(0),
    openCount: integer("open_count").default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).default(
      sql`now()`
    ),
  },
  (table) => [
    unique("screen_time_logs_user_id_app_package_name_usage_date_unique").on(
      table.userId,
      table.appPackageName,
      table.usageDate
    ),
    index("idx_screen_time_user_date").on(table.userId, table.usageDate),
  ]
);
