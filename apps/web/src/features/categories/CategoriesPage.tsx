import { useMemo, useState } from "react";
import { canAccess } from "@imsys/auth";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { CardFooter } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { useAuth } from "../../app/auth/AuthProvider";
import { ResourceCollectionCard } from "../../design-system/patterns/resources/ResourceCollectionCard";
import { ResourceCreateCard } from "../../design-system/patterns/resources/ResourceCreateCard";
import { ResourceEmptyState } from "../../design-system/patterns/resources/ResourceEmptyState";
import { ResourcePageHeader } from "../../design-system/patterns/resources/ResourcePageHeader";
import { categoriesResource, useCategoriesResource } from ".";

const formatDateTime = (value: string) => new Date(value).toLocaleString();

export const CategoriesPage = () => {
  const { t } = useTranslation(["common", "resources", "errors"]);
  const { session, permissionMap } = useAuth();
  const [createName, setCreateName] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const accessToken = session?.access_token ?? null;
  const { categoriesQuery, createCategoryMutation, updateCategoryMutation, deleteCategoryMutation } = useCategoriesResource(accessToken);

  if (!session) {
    return null;
  }

  const categories = categoriesQuery.data ?? [];
  const sortedCategories = useMemo(
    () => [...categories]
      .sort((left, right) => (right.updatedAt ?? right.createdAt).localeCompare(left.updatedAt ?? left.createdAt))
      .filter((category) => category.name.toLowerCase().includes(search.toLowerCase())),
    [categories, search]
  );
  const totalCategories = categories.length;
  const latestCategory = sortedCategories[0];
  const canCreate = canAccess(permissionMap, "categories", "create");
  const canUpdate = canAccess(permissionMap, "categories", "update");
  const canDelete = canAccess(permissionMap, "categories", "delete");
  const busy = createCategoryMutation.isPending || updateCategoryMutation.isPending || deleteCategoryMutation.isPending;

  const handleCreate = async () => {
    const name = createName.trim();
    if (!name || !canCreate) {
      return;
    }

    try {
      await createCategoryMutation.mutateAsync(name);
      setCreateName("");
      toast.success(t("common:create"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors:createCategory"));
    }
  };

  const handleUpdate = async () => {
    const name = editingName.trim();
    if (!editingId || !name || !canUpdate) {
      return;
    }

    try {
      await updateCategoryMutation.mutateAsync({ id: editingId, name });
      setEditingId(null);
      setEditingName("");
      toast.success(t("common:update"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors:updateCategory"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) {
      return;
    }

    try {
      await deleteCategoryMutation.mutateAsync(id);
      toast.success(t("common:delete"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors:deleteCategory"));
    }
  };

  return (
    <section className="relative min-h-screen overflow-hidden">
      <ResourcePageHeader
        resource={categoriesResource}
        totalCount={totalCategories}
        latestLabel={latestCategory ? formatDateTime(latestCategory.updatedAt ?? latestCategory.createdAt) : "-"}
      />

      <div className="flex flex-col gap-3">
        <ResourceCreateCard resource={categoriesResource}>
          <Input
            placeholder={t(categoriesResource.createPlaceholderKey)}
            value={createName}
            onChange={(event) => setCreateName(event.target.value)}
            disabled={!canCreate || busy}
          />
          <Button type="button" onClick={() => void handleCreate()} disabled={!canCreate || !createName.trim() || busy}>
            {t("common:create")}
          </Button>
        </ResourceCreateCard>

        <ResourceCollectionCard
          resource={categoriesResource}
          totalCount={totalCategories}
          isFetching={categoriesQuery.isFetching}
          toolbar={(
            <div className="flex justify-start">
              <Input
                className="max-w-[320px]"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t(categoriesResource.searchPlaceholderKey)}
              />
            </div>
          )}
          error={categoriesQuery.error ? (
            <div className="rounded-2xl border border-[rgba(167,58,42,0.22)] bg-[#f8ddd5] px-4 py-3.5 text-[#7b2317]" role="alert">
              {categoriesQuery.error instanceof Error ? categoriesQuery.error.message : t("errors:loadCategories")}
            </div>
          ) : undefined}
          loading={categoriesQuery.isLoading ? <p className="text-[var(--muted)]">Loading...</p> : undefined}
          empty={!categoriesQuery.isLoading && sortedCategories.length === 0 ? <ResourceEmptyState resource={categoriesResource} /> : undefined}
        >
          {sortedCategories.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {sortedCategories.map((category) => {
                const isEditing = editingId === category.id;

                return (
                  <article className="grid gap-3 rounded-[18px] border border-[rgba(42,29,20,0.08)] bg-[rgba(255,253,249,0.86)] p-4 shadow-[0_6px_16px_rgba(21,18,16,0.04)]" key={category.id}>
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#191513] text-[0.96rem] font-extrabold text-[#fff7ef]" aria-hidden="true">
                        {category.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="grid gap-0.5">
                        <h3 className="m-0 text-[1.04rem] leading-[1.3]">{category.name}</h3>
                        <p className="m-0 text-[0.88rem] text-[var(--muted)]">Created {formatDateTime(category.createdAt)}</p>
                        <p className="m-0 text-[0.88rem] text-[var(--muted)]">Updated {category.updatedAt ? formatDateTime(category.updatedAt) : "-"}</p>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="flex flex-col items-stretch gap-2.5">
                        <Input
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          placeholder={t(categoriesResource.createPlaceholderKey)}
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <Button type="button" variant="secondary" size="sm" onClick={() => setEditingId(null)}>
                            {t("common:cancel")}
                          </Button>
                          <Button type="button" size="sm" disabled={!editingName.trim() || busy} onClick={() => void handleUpdate()}>
                            {t("common:save")}
                          </Button>
                        </div>
                      </div>
                    ) : null}

                    <CardFooter className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        type="button"
                        disabled={!canUpdate}
                        onClick={() => {
                          setEditingId(category.id);
                          setEditingName(category.name);
                        }}
                      >
                        {t("common:update")}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        type="button"
                        disabled={!canDelete || busy}
                        onClick={() => void handleDelete(category.id)}
                      >
                        {t("common:delete")}
                      </Button>
                    </CardFooter>
                  </article>
                );
              })}
            </div>
          ) : null}
        </ResourceCollectionCard>
      </div>
    </section>
  );
};
