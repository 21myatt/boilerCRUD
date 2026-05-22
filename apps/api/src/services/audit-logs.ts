import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@imsys/db";
import { auditLogs } from "@imsys/db/schema";
import type { AuditLogEntry } from "@imsys/types";
import { getAppEnv } from "../lib/app-env";

type AuditPayload = {
  actorUserId?: string | null;
  targetUserId?: string | null;
  action: string;
  resource: string;
  payload?: Record<string, unknown>;
};

const obfuscateEmail = (email?: string | null) => {
  if (!email) {
    return null;
  }

  const [localPart, domain] = email.trim().toLowerCase().split("@");

  if (!localPart || !domain) {
    return "***";
  }

  return `${localPart.slice(0, 2)}***@${domain}`;
};

const redactPayload = (payload: Record<string, unknown>) => {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(payload)) {
    if (key === "password") {
      result[key] = "[redacted]";
      continue;
    }

    if (key.toLowerCase().includes("email") && typeof value === "string") {
      result[key] = obfuscateEmail(value);
      continue;
    }

    result[key] = value;
  }

  return result;
};

export const writeAuditLog = async ({
  actorUserId,
  targetUserId,
  action,
  resource,
  payload
}: AuditPayload) => {
  if (writeAuditLogOverride) {
    await writeAuditLogOverride({
      actorUserId,
      targetUserId,
      action,
      resource,
      payload
    });
    return;
  }

  const db = getDb();

  await db.insert(auditLogs).values({
    id: crypto.randomUUID(),
    appEnv: getAppEnv(),
    actorUserId: actorUserId ?? null,
    targetUserId: targetUserId ?? null,
    action,
    resource,
    payloadSummary: redactPayload(payload ?? {}),
    createdAt: new Date()
  });
};

let writeAuditLogOverride: ((payload: AuditPayload) => Promise<void> | void) | null = null;

export const setWriteAuditLogForTests = (
  writer: ((payload: AuditPayload) => Promise<void> | void) | null
) => {
  writeAuditLogOverride = writer;
};

export const listRecentAuditLogs = async (limit = 25) => {
  const db = getDb();
  const rows = await db
    .select()
    .from(auditLogs)
    .where(eq(auditLogs.appEnv, getAppEnv()))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);

  return rows.map((row): AuditLogEntry => ({
    id: row.id,
    actorUserId: row.actorUserId,
    targetUserId: row.targetUserId,
    action: row.action,
    resource: row.resource,
    payloadSummary: row.payloadSummary as Record<string, unknown>,
    createdAt: new Date(row.createdAt).toISOString()
  }));
};

export const listAuditLogsForTargetUser = async (targetUserId: string, limit = 25) => {
  const db = getDb();
  const rows = await db
    .select()
    .from(auditLogs)
    .where(and(eq(auditLogs.targetUserId, targetUserId), eq(auditLogs.appEnv, getAppEnv())))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);

  return rows.map((row): AuditLogEntry => ({
    id: row.id,
    actorUserId: row.actorUserId,
    targetUserId: row.targetUserId,
    action: row.action,
    resource: row.resource,
    payloadSummary: row.payloadSummary as Record<string, unknown>,
    createdAt: new Date(row.createdAt).toISOString()
  }));
};
