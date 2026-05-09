import { useMemo, useRef, useState } from "react";
import { canAccess } from "@imsys/auth";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useAuth } from "../../app/auth/AuthProvider";
import { ResourceCollectionCard } from "../../design-system/patterns/resources/ResourceCollectionCard";
import { ResourceCreateCard } from "../../design-system/patterns/resources/ResourceCreateCard";
import { ResourceEmptyState } from "../../design-system/patterns/resources/ResourceEmptyState";
import { ResourcePageHeader } from "../../design-system/patterns/resources/ResourcePageHeader";
import { supabase } from "../../lib/supabase";
import { assetsResource } from "./definition";
import { getAssetSignedUrl } from "./data";
import { useAssetsResource } from "./hooks";

const formatDateTime = (value: string) => new Date(value).toLocaleString();

const formatBytes = (value: number) => {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

export const AssetsPage = () => {
  const { t } = useTranslation(["common", "resources", "errors"]);
  const { session, permissionMap } = useAuth();
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { assetsQuery, uploadAssetMutation, deleteAssetMutation } = useAssetsResource(session);

  if (!session) {
    return null;
  }

  const assets = assetsQuery.data ?? [];
  const visibleAssets = useMemo(
    () => assets.filter((asset) => {
      const query = search.toLowerCase();
      return (
        asset.fileName.toLowerCase().includes(query)
        || (asset.title ?? "").toLowerCase().includes(query)
        || asset.mimeType.toLowerCase().includes(query)
      );
    }),
    [assets, search]
  );
  const latestAsset = visibleAssets[0];
  const canCreate = canAccess(permissionMap, "assets", "create");
  const canDelete = canAccess(permissionMap, "assets", "delete");
  const busy = uploadAssetMutation.isPending || deleteAssetMutation.isPending;

  const handleUpload = async (file: File | null) => {
    if (!file || !canCreate) {
      return;
    }

    try {
      await uploadAssetMutation.mutateAsync({
        file,
        title: file.name
      });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      toast.success(t("resources:assetsUploaded"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors:createAsset"));
    }
  };

  return (
    <section className="relative min-h-screen overflow-hidden">
      <ResourcePageHeader
        resource={assetsResource}
        totalCount={assets.length}
        latestLabel={latestAsset ? formatDateTime(latestAsset.updatedAt ?? latestAsset.createdAt) : "-"}
      />

      <div className="flex flex-col gap-3">
        <ResourceCreateCard resource={assetsResource}>
          <input
            ref={fileInputRef}
            type="file"
            hidden
            onChange={(event) => {
              void handleUpload(event.target.files?.[0] ?? null);
            }}
            disabled={!canCreate || busy}
          />
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!canCreate || busy}
          >
            {uploadAssetMutation.isPending ? "Uploading..." : t("resources:assetsUploadAction")}
          </Button>
        </ResourceCreateCard>

        <ResourceCollectionCard
          resource={assetsResource}
          totalCount={assets.length}
          isFetching={assetsQuery.isFetching}
          toolbar={(
            <div className="flex justify-start">
              <Input
                className="max-w-[320px]"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t(assetsResource.searchPlaceholderKey)}
              />
            </div>
          )}
          error={assetsQuery.error ? (
            <div className="rounded-2xl border border-[rgba(167,58,42,0.22)] bg-[#f8ddd5] px-4 py-3.5 text-[#7b2317]" role="alert">
              {assetsQuery.error instanceof Error ? assetsQuery.error.message : t("errors:loadAssets")}
            </div>
          ) : undefined}
          loading={assetsQuery.isLoading ? <p className="text-[var(--muted)]">Loading...</p> : undefined}
          empty={!assetsQuery.isLoading && visibleAssets.length === 0 ? <ResourceEmptyState resource={assetsResource} /> : undefined}
        >
          {visibleAssets.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {visibleAssets.map((asset) => (
                <article className="grid gap-3 rounded-[18px] border border-[rgba(42,29,20,0.08)] bg-[rgba(255,253,249,0.86)] p-4 shadow-[0_6px_16px_rgba(21,18,16,0.04)]" key={asset.id}>
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#191513] text-[0.96rem] font-extrabold text-[#fff7ef]" aria-hidden="true">
                      {asset.fileName.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="grid gap-0.5">
                      <h3 className="m-0 text-[1.04rem] leading-[1.3]">{asset.title || asset.fileName}</h3>
                      <p className="m-0 text-[0.88rem] text-[var(--muted)]">{asset.fileName}</p>
                      <p className="m-0 text-[0.88rem] text-[var(--muted)]">{asset.mimeType} · {formatBytes(asset.sizeBytes)}</p>
                      <p className="m-0 text-[0.88rem] text-[var(--muted)]">Updated {formatDateTime(asset.updatedAt ?? asset.createdAt)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        void getAssetSignedUrl(supabase, asset)
                          .then((url) => window.open(url, "_blank", "noopener,noreferrer"))
                          .catch((error) => {
                            toast.error(error instanceof Error ? error.message : t("errors:loadAssetUrl"));
                          });
                      }}
                    >
                      {t("resources:assetsOpenAction")}
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      disabled={!canDelete || busy}
                      onClick={() => {
                        void deleteAssetMutation.mutateAsync(asset.id)
                          .then(() => {
                            toast.success(t("resources:assetsDeleted"));
                          })
                          .catch((error) => {
                            toast.error(error instanceof Error ? error.message : t("errors:deleteAsset"));
                          });
                      }}
                    >
                      {t("common:delete")}
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </ResourceCollectionCard>
      </div>
    </section>
  );
};
