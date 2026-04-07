import {
  uuid,
  varchar,
  integer,
  timestamp,
  pgTable,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const friendGroups = pgTable("friend_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  inviteCode: varchar("invite_code", { length: 8 }).notNull().unique(),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => users.id),
  maxMembers: integer("max_members").default(20),
  createdAt: timestamp("created_at", { withTimezone: true }).default(
    sql`now()`
  ),
});
