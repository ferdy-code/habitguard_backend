import {
  uuid,
  varchar,
  text,
  timestamp,
  index,
  pgEnum,
  pgTable,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

export const chatRoleEnum = pgEnum("chat_role", ["user", "assistant"]);

export const aiChatMessages = pgTable(
  "ai_chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: chatRoleEnum("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).default(
      sql`now()`
    ),
  },
  (table) => [
    index("idx_ai_chat_user").on(table.userId, table.createdAt),
  ]
);
