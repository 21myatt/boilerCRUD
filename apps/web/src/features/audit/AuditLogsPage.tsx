import { useMemo } from "react";
import { createAuditLogsClient } from "@imsys/api-client";
import { useQuery } from "@tanstack/react-query";
import type { ResourceDefinition } from "@imsys/types";
import { useAuth } from "../../app/auth/AuthProvider";
import { ResourceCollectionCard } from "../../design-system/patterns/resources/ResourceCollectionCard";
import { ResourcePageHeader } from "../../design-system/patterns/resources/ResourcePageHeader";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

const resource: ResourceDefinition<unknown> = {
  key: "audit",
  labelKey: "resources:usersLabel",
  pageTitleKey: "resources:usersLabel",
  descriptionKey: "resources:usersDescription",
  createLabelKey: "resources:usersCreateLabel",
  createPlaceholderKey: "resources:usersCreatePlaceholder",
  searchPlaceholderKey: "resources:usersSearch",
  totalLabelKey: "resources:usersLabel",
  latestLabelKey: "resources:usersLabel",
  emptyTitleKey: "resources:usersEmptyTitle",
  emptyDescriptionKey: "resources:usersEmptyDescription",
  routeBase: "/audit-logs",
  permissions: ["read"],
  columns: [],
  filters: [],
  sorts: [],
  formFields: [],
  detailSections: [],
  bulkActions: []
};

export const AuditLogsPage = () => {
  const { session } = useAuth();
  const accessToken = session?.access_token ?? null;
  const client = useMemo(
    () => createAuditLogsClient(apiUrl, { getAccessToken: () => accessToken }),
    [accessToken]
  );

  const auditLogsQuery = useQuery({
    queryKey: ["audit-logs", accessToken],
    queryFn: () => client.getAuditLogs(),
    enabled: Boolean(accessToken)
  });

  const logs = auditLogsQuery.data ?? [];

  return (
    <section className="relative min-h-screen overflow-hidden">
      <ResourcePageHeader
        resource={resource}
        totalCount={logs.length}
        latestLabel={logs[0]?.createdAt ?? "-"}
      />

      <ResourceCollectionCard
        resource={resource}
        totalCount={logs.length}
        isFetching={auditLogsQuery.isFetching}
        toolbar={<div />}
        error={auditLogsQuery.error ? (
          <div className="rounded-2xl border border-[rgba(167,58,42,0.22)] bg-[#f8ddd5] px-4 py-3.5 text-[#7b2317]" role="alert">
            {auditLogsQuery.error instanceof Error ? auditLogsQuery.error.message : "Failed to load audit logs"}
          </div>
        ) : undefined}
        loading={auditLogsQuery.isLoading ? <p className="text-[var(--muted)]">Loading...</p> : undefined}
      >
        <div className="grid gap-3">
          {logs.map((log) => (
            <article
              key={log.id}
              className="grid gap-2 rounded-[18px] border border-[rgba(42,29,20,0.08)] bg-[rgba(255,253,249,0.86)] p-4 shadow-[0_6px_16px_rgba(21,18,16,0.04)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[#eadac6] px-2.5 py-1 text-xs font-bold uppercase tracking-[0.08em] text-[#171412]">
                    {log.action}
                  </span>
                  <span className="text-sm text-[var(--muted)]">{log.resource}</span>
                </div>
                <span className="text-sm text-[var(--muted)]">{new Date(log.createdAt).toLocaleString()}</span>
              </div>
              <div className="grid gap-1 text-sm text-[var(--muted)]">
                <p className="m-0">Actor: {log.actorUserId ?? "-"}</p>
                <p className="m-0">Target: {log.targetUserId ?? "-"}</p>
              </div>
              <pre className="m-0 overflow-auto rounded-[14px] bg-[rgba(25,21,19,0.04)] p-3 text-xs text-[var(--text)]">
                {JSON.stringify(log.payloadSummary, null, 2)}
              </pre>
            </article>
          ))}
        </div>
      </ResourceCollectionCard>
    </section>
  );
};
