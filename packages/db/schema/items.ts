import { sql } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const items = pgTable("items", {
  id: uuid("id").primaryKey(),
  appEnv: text("app_env").notNull(),
  userId: uuid("user_id").notNull().default(sql`auth.uid()`),
  categoryId: uuid("category_id"),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  appEnvUserIdCreatedAtIdx: index("items_app_env_user_id_created_at_idx").on(table.appEnv, table.userId, table.createdAt),
  appEnvUserIdCategoryIdIdx: index("items_app_env_user_id_category_id_idx").on(table.appEnv, table.userId, table.categoryId)
}));

export type ItemRow = typeof items.$inferSelect;
