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

export const friendshipStatusEnum = pgEnum("friendship_status", [
  "pending",
  "accepted",
  "blocked",
]);

export const friendships = pgTable(
  "friendships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requesterId: uuid("requester_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    addresseeId: uuid("addressee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: friendshipStatusEnum("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).default(
      sql`now()`
    ),
    updatedAt: timestamp("updated_at", { withTimezone: true }).default(
      sql`now()`
    ),
  },
  (table) => [
    unique("friendships_requester_id_addressee_id_unique").on(
      table.requesterId,
      table.addresseeId
    ),
  ]
);
