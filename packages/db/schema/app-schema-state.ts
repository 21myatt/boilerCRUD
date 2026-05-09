import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const appSchemaState = pgTable("app_schema_state", {
  singletonKey: text("singleton_key").primaryKey(),
  schemaVersion: text("schema_version").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export type AppSchemaStateRow = typeof appSchemaState.$inferSelect;
