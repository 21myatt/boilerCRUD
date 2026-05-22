import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey(),
  appEnv: text("app_env").notNull(),
  actorUserId: uuid("actor_user_id"),
  targetUserId: uuid("target_user_id"),
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  payloadSummary: jsonb("payload_summary").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  appEnvActorIdx: index("audit_logs_app_env_actor_user_id_idx").on(table.appEnv, table.actorUserId),
  appEnvTargetIdx: index("audit_logs_app_env_target_user_id_idx").on(table.appEnv, table.targetUserId),
  appEnvResourceIdx: index("audit_logs_app_env_resource_idx").on(table.appEnv, table.resource),
  appEnvCreatedAtIdx: index("audit_logs_app_env_created_at_idx").on(table.appEnv, table.createdAt)
}));

export type AuditLogRow = typeof auditLogs.$inferSelect;
