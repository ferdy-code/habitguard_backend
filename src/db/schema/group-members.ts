import {
  uuid,
  varchar,
  timestamp,
  unique,
  pgEnum,
  pgTable,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";
import { friendGroups } from "./friend-groups";

export const groupRoleEnum = pgEnum("group_role", ["admin", "member"]);

export const groupMembers = pgTable(
  "group_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => friendGroups.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: groupRoleEnum("role").default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).default(
      sql`now()`
    ),
  },
  (table) => [
    unique("group_members_group_id_user_id_unique").on(
      table.groupId,
      table.userId
    ),
  ]
);
