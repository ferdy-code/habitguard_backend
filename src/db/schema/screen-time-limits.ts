import {
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  pgTable,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const screenTimeLimits = pgTable(
  "screen_time_limits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    appPackageName: varchar("app_package_name", { length: 255 }),
    category: varchar("category", { length: 50 }),
    limitMinutes: integer("limit_minutes").notNull(),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).default(
      sql`now()`
    ),
    updatedAt: timestamp("updated_at", { withTimezone: true }).default(
      sql`now()`
    ),
  }
);
