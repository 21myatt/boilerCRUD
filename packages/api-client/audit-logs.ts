import type { AuditLogEntry } from "@imsys/types";

type ApiEnvelope<T> = {
  data?: T;
  error?: string;
};

type RequestOptions = {
  getAccessToken?: () => Promise<string | null> | string | null;
};

export const getAuditLogs = async (
  baseUrl: string,
  options?: RequestOptions
): Promise<AuditLogEntry[]> => {
  const accessToken = await options?.getAccessToken?.();
  const response = await fetch(new URL("/admin/audit-logs", baseUrl), {
    headers: {
      "content-type": "application/json",
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {})
    }
  });
  const body = await response.json() as ApiEnvelope<AuditLogEntry[]>;

  if (!response.ok) {
    throw new Error(body.error ?? `Request failed with ${response.status}`);
  }

  return body.data ?? [];
};

export const createAuditLogsClient = (baseUrl: string, options?: RequestOptions) => ({
  getAuditLogs: () => getAuditLogs(baseUrl, options)
});
