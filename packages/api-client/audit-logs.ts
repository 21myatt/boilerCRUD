import { apiEnvelopeSchema, auditLogListSchema, type AuditLogEntry } from "@imsys/types";
import { requestEnvelope, type RequestOptions } from "./request";

export const getAuditLogs = async (
  baseUrl: string,
  options?: RequestOptions
): Promise<AuditLogEntry[]> => {
  const body = await requestEnvelope<AuditLogEntry[]>(
    baseUrl,
    "/admin/audit-logs",
    undefined,
    options,
    apiEnvelopeSchema(auditLogListSchema)
  );
  return body.data ?? [];
};

export const createAuditLogsClient = (baseUrl: string, options?: RequestOptions) => ({
  getAuditLogs: () => getAuditLogs(baseUrl, options)
});
