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
import { useCategoriesResource } from "../categories/hooks";
import { itemsResource, useItemsResource } from ".";

const formatDateTime = (value: string) => new Date(value).toLocaleString();

export const ItemsPage = () => {
  const { t } = useTranslation(["common", "resources", "errors"]);
  const { session, permissionMap } = useAuth();
  const [createName, setCreateName] = useState("");
  const [createCategoryId, setCreateCategoryId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string>("");

  const accessToken = session?.access_token ?? null;
  const { itemsQuery, createItemMutation, updateItemMutation, deleteItemMutation } = useItemsResource(accessToken);
  const { categoriesQuery } = useCategoriesResource(accessToken);

  if (!session) {
    return null;
  }

  const items = itemsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const categoryNameById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories]
  );
  const sortedItems = useMemo(
    () => [...items]
      .sort((left, right) => (right.updatedAt ?? right.createdAt).localeCompare(left.updatedAt ?? left.createdAt))
      .filter((item) => {
        const query = search.toLowerCase();
        const categoryName = item.categoryId ? categoryNameById.get(item.categoryId)?.toLowerCase() ?? "" : "";
        return item.name.toLowerCase().includes(query) || categoryName.includes(query);
      }),
    [categoryNameById, items, search]
  );
  const totalItems = items.length;
  const latestItem = sortedItems[0];
  const canCreate = canAccess(permissionMap, "items", "create");
  const canUpdate = canAccess(permissionMap, "items", "update");
  const canDelete = canAccess(permissionMap, "items", "delete");

  const busy = createItemMutation.isPending || updateItemMutation.isPending || deleteItemMutation.isPending;

  const handleCreate = async () => {
    const name = createName.trim();
    if (!name || !canCreate) {
      return;
    }

    try {
      await createItemMutation.mutateAsync({
        name,
        categoryId: createCategoryId || null
      });
      setCreateName("");
      setCreateCategoryId("");
      toast.success(t("common:create"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors:createItem"));
    }
  };

  const handleUpdate = async () => {
    const name = editingName.trim();
    if (!editingId || !name || !canUpdate) {
      return;
    }

    try {
      await updateItemMutation.mutateAsync({
        id: editingId,
        name,
        categoryId: editingCategoryId || null
      });
      setEditingId(null);
      setEditingName("");
      setEditingCategoryId("");
      toast.success(t("common:update"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors:updateItem"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!canDelete) {
      return;
    }

    try {
      await deleteItemMutation.mutateAsync(id);
      toast.success(t("common:delete"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errors:deleteItem"));
    }
  };

  return (
    <section className="relative min-h-screen overflow-hidden">
      <ResourcePageHeader
        resource={itemsResource}
        totalCount={totalItems}
        latestLabel={latestItem ? formatDateTime(latestItem.updatedAt ?? latestItem.createdAt) : "-"}
      />

      <div className="flex flex-col gap-3">
        <ResourceCreateCard resource={itemsResource}>
          <div className="grid gap-2.5 md:grid-cols-2">
            <Input
              placeholder={t(itemsResource.createPlaceholderKey)}
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              disabled={!canCreate || busy}
            />
            <select
              className="w-full rounded-[14px] border border-[rgba(42,29,20,0.12)] bg-[var(--panel-strong)] px-3.5 py-3 text-[var(--text)] outline-none transition focus:border-[rgba(28,23,20,0.34)] focus:shadow-[0_0_0_4px_rgba(28,23,20,0.08)]"
              value={createCategoryId}
              onChange={(event) => setCreateCategoryId(event.target.value)}
              disabled={!canCreate || busy}
            >
              <option value="">No category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
          </div>
          <Button type="button" onClick={() => void handleCreate()} disabled={!canCreate || !createName.trim() || busy}>
            {t("common:create")}
          </Button>
        </ResourceCreateCard>

        <ResourceCollectionCard
          resource={itemsResource}
          totalCount={totalItems}
          isFetching={itemsQuery.isFetching}
          toolbar={(
            <div className="flex justify-start">
              <Input
                className="max-w-[320px]"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t(itemsResource.searchPlaceholderKey)}
              />
            </div>
          )}
          error={itemsQuery.error ? (
            <div className="rounded-2xl border border-[rgba(167,58,42,0.22)] bg-[#f8ddd5] px-4 py-3.5 text-[#7b2317]" role="alert">
              {itemsQuery.error instanceof Error ? itemsQuery.error.message : t("errors:loadItems")}
            </div>
          ) : undefined}
          loading={itemsQuery.isLoading ? <p className="text-[var(--muted)]">Loading...</p> : undefined}
          empty={!itemsQuery.isLoading && sortedItems.length === 0 ? <ResourceEmptyState resource={itemsResource} /> : undefined}
        >
          {sortedItems.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {sortedItems.map((item) => {
                const isEditing = editingId === item.id;

                return (
                  <article className="grid gap-3 rounded-[18px] border border-[rgba(42,29,20,0.08)] bg-[rgba(255,253,249,0.86)] p-4 shadow-[0_6px_16px_rgba(21,18,16,0.04)]" key={item.id}>
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#191513] text-[0.96rem] font-extrabold text-[#fff7ef]" aria-hidden="true">
                        {item.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="grid gap-0.5">
                        <h3 className="m-0 text-[1.04rem] leading-[1.3]">{item.name}</h3>
                        <p className="m-0 text-[0.82rem] font-semibold uppercase tracking-[0.08em] text-[#8d6743]">
                          {item.categoryId ? categoryNameById.get(item.categoryId) ?? "Unassigned" : "Unassigned"}
                        </p>
                        <p className="m-0 text-[0.88rem] text-[var(--muted)]">Created {formatDateTime(item.createdAt)}</p>
                        <p className="m-0 text-[0.88rem] text-[var(--muted)]">Updated {item.updatedAt ? formatDateTime(item.updatedAt) : "-"}</p>
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="flex flex-col items-stretch gap-2.5">
                        <Input
                          value={editingName}
                          onChange={(event) => setEditingName(event.target.value)}
                          placeholder={t(itemsResource.createPlaceholderKey)}
                        />
                        <select
                          className="w-full rounded-[14px] border border-[rgba(42,29,20,0.12)] bg-[var(--panel-strong)] px-3.5 py-3 text-[var(--text)] outline-none transition focus:border-[rgba(28,23,20,0.34)] focus:shadow-[0_0_0_4px_rgba(28,23,20,0.08)]"
                          value={editingCategoryId}
                          onChange={(event) => setEditingCategoryId(event.target.value)}
                        >
                          <option value="">No category</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>{category.name}</option>
                          ))}
                        </select>
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setEditingId(null);
                              setEditingName("");
                              setEditingCategoryId("");
                            }}
                          >
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
                          setEditingId(item.id);
                          setEditingName(item.name);
                          setEditingCategoryId(item.categoryId ?? "");
                        }}
                      >
                        {t("common:update")}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        type="button"
                        disabled={!canDelete || busy}
                        onClick={() => void handleDelete(item.id)}
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
