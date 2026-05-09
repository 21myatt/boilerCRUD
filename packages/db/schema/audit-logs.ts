import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey(),
  actorUserId: uuid("actor_user_id"),
  targetUserId: uuid("target_user_id"),
  action: text("action").notNull(),
  resource: text("resource").notNull(),
  payloadSummary: jsonb("payload_summary").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  actorIdx: index("audit_logs_actor_user_id_idx").on(table.actorUserId),
  targetIdx: index("audit_logs_target_user_id_idx").on(table.targetUserId),
  resourceIdx: index("audit_logs_resource_idx").on(table.resource),
  createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt)
}));

export type AuditLogRow = typeof auditLogs.$inferSelect;
