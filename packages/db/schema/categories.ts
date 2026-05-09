import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().default(sql`auth.uid()`),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  userIdCreatedAtIdx: index("categories_user_id_created_at_idx").on(table.userId, table.createdAt)
}));

export type CategoryRow = typeof categories.$inferSelect;
