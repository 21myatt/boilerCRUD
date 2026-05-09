import { index, pgTable, text, timestamp, uuid, boolean } from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  disabled: boolean("disabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  emailIdx: index("profiles_email_idx").on(table.email),
  roleIdx: index("profiles_role_idx").on(table.role)
}));

export type ProfileRow = typeof profiles.$inferSelect;
