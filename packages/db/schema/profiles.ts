import { boolean, index, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
  id: uuid("id").notNull(),
  appEnv: text("app_env").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  disabled: boolean("disabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  pk: primaryKey({ columns: [table.id, table.appEnv] }),
  emailIdx: index("profiles_email_app_env_idx").on(table.email, table.appEnv),
  roleIdx: index("profiles_role_app_env_idx").on(table.role, table.appEnv)
}));

export type ProfileRow = typeof profiles.$inferSelect;
