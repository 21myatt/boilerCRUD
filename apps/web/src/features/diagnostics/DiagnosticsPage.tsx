import { useMemo } from "react";
import { createDiagnosticsClient } from "@imsys/api-client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../app/auth/AuthProvider";
import { ResourceCollectionCard } from "../../design-system/patterns/resources/ResourceCollectionCard";
import { ResourcePageHeader } from "../../design-system/patterns/resources/ResourcePageHeader";
import { apiBaseUrl } from "../../lib/api-base-url";

export const DiagnosticsPage = () => {
  const { session } = useAuth();
  const accessToken = session?.access_token ?? null;
  const client = useMemo(
    () => createDiagnosticsClient(apiBaseUrl, { getAccessToken: () => accessToken }),
    [accessToken]
  );

  const diagnosticsQuery = useQuery({
    queryKey: ["diagnostics", accessToken],
    queryFn: () => client.getDiagnostics(),
    enabled: Boolean(accessToken)
  });

  const checks = diagnosticsQuery.data?.checks
    ? Object.entries(diagnosticsQuery.data.checks)
    : [];

  return (
    <section className="relative min-h-screen overflow-hidden">
      <ResourcePageHeader
        resource={{
          key: "diagnostics",
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
          routeBase: "/diagnostics",
          permissions: ["read"],
          columns: [],
          filters: [],
          sorts: [],
          formFields: [],
          detailSections: [],
          bulkActions: []
        }}
        totalCount={checks.length}
        latestLabel={diagnosticsQuery.data?.checkedAt ?? "-"}
      />

      <ResourceCollectionCard
        resource={{
          key: "diagnostics",
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
          routeBase: "/diagnostics",
          permissions: ["read"],
          columns: [],
          filters: [],
          sorts: [],
          formFields: [],
          detailSections: [],
          bulkActions: []
        }}
        totalCount={checks.length}
        isFetching={diagnosticsQuery.isFetching}
        toolbar={<div />}
        error={diagnosticsQuery.error ? (
          <div className="rounded-2xl border border-[rgba(167,58,42,0.22)] bg-[#f8ddd5] px-4 py-3.5 text-[#7b2317]" role="alert">
            {diagnosticsQuery.error instanceof Error ? diagnosticsQuery.error.message : "Failed to load diagnostics"}
          </div>
        ) : undefined}
        loading={diagnosticsQuery.isLoading ? <p className="text-[var(--muted)]">Loading...</p> : undefined}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {checks.map(([key, check]) => (
            <article
              key={key}
              className="grid gap-2 rounded-[18px] border border-[rgba(42,29,20,0.08)] bg-[rgba(255,253,249,0.86)] p-4 shadow-[0_6px_16px_rgba(21,18,16,0.04)]"
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="m-0 text-[1rem] capitalize">{key}</h3>
                <span className={check.ok ? "rounded-full bg-[#dcefdc] px-2.5 py-1 text-xs font-bold text-[#175b22]" : "rounded-full bg-[#f8ddd5] px-2.5 py-1 text-xs font-bold text-[#7b2317]"}>
                  {check.ok ? "OK" : "Check"}
                </span>
              </div>
              {"expected" in check || "actual" in check ? (
                <div className="grid gap-1 text-sm text-[var(--muted)]">
                  <p className="m-0">Expected: {check.expected ?? "-"}</p>
                  <p className="m-0">Actual: {check.actual ?? "-"}</p>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </ResourceCollectionCard>
    </section>
  );
};
