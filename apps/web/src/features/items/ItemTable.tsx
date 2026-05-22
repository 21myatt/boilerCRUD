import { useEffect, useMemo, useState } from "react";
import type { Item } from "@imsys/types";
import { createItemsClient } from "@imsys/api-client";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { apiBaseUrl } from "../../lib/api-base-url";
import { CreateItemForm } from "./CreateItemForm";
import { DeleteItemButton } from "./DeleteItemButton";
import { EditItemModal } from "./EditItemModal";

type ItemTableProps = {
  accessToken: string;
  viewerEmail: string;
  onSignOut: () => void;
};

export const ItemTable = ({ accessToken, viewerEmail, onSignOut }: ItemTableProps) => {
  const client = useMemo(
    () => createItemsClient(apiBaseUrl, { getAccessToken: () => accessToken }),
    [accessToken]
  );
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createName, setCreateName] = useState("");
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);

  const sortedItems = useMemo(
    () => [...items].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [items]
  );
  const totalItems = sortedItems.length;
  const latestItem = sortedItems[0];
  const hasItems = totalItems > 0;
  const formattedLatest = latestItem
    ? new Date(latestItem.updatedAt ?? latestItem.createdAt).toLocaleString()
    : "No activity yet";

  const loadItems = async () => {
    setLoading(true);
    setError(null);

    try {
      setItems(await client.getItems());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadItems();
  }, [client]);

  const handleCreate = async () => {
    if (!createName.trim()) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await client.createItem({ name: createName.trim(), categoryId: null });
      setCreateName("");
      await loadItems();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create item");
    } finally {
      setBusy(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingItem) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      await client.updateItem(editingItem.id, { name: editingItem.name.trim() });
      setEditingItem(null);
      await loadItems();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update item");
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    setBusy(true);
    setError(null);

    try {
      await client.deleteItem(id);
      await loadItems();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete item");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -right-20 -top-[60px] h-60 w-60 rounded-full bg-[rgba(168,123,81,0.2)] blur-[2px]" />
      <div className="pointer-events-none absolute -left-[90px] bottom-10 h-[280px] w-[280px] rounded-full bg-[rgba(30,41,59,0.08)] blur-[2px]" />

      <div className="relative z-[1] mx-auto grid max-w-[1120px] gap-3">
        <header className="grid gap-3 rounded-[20px] border border-[var(--border)] bg-[var(--panel)] p-[18px] shadow-[var(--shadow)] backdrop-blur-[12px]">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <Badge variant="secondary">Starter dashboard</Badge>
            <div className="inline-flex flex-wrap items-center gap-2 text-[0.92rem] text-[var(--muted)]">
              <span>{viewerEmail}</span>
              <Button variant="ghost" size="sm" type="button" onClick={onSignOut}>
                Sign out
              </Button>
            </div>
          </div>

          <div className="grid max-w-[680px] gap-1">
            <h1 className="m-0 text-[clamp(2rem,3.6vw,3.6rem)] leading-none tracking-[-0.05em]">Items</h1>
          </div>

          <div className="grid gap-2.5 md:grid-cols-2" aria-label="Item summary">
            <Card className="bg-[rgba(255,255,255,0.72)]">
              <CardHeader>
                <CardDescription>Total items</CardDescription>
                <CardTitle>{totalItems}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-[rgba(255,255,255,0.72)]">
              <CardHeader>
                <CardDescription>Latest update</CardDescription>
                <CardTitle>{formattedLatest}</CardTitle>
              </CardHeader>
            </Card>
          </div>
        </header>

        <CreateItemForm value={createName} onChange={setCreateName} onSubmit={handleCreate} busy={busy} />

        <Card className="rounded-[20px]">
          <CardHeader className="flex items-start justify-between gap-3 p-[18px] pb-0">
            <div>
              <Badge variant="outline">Library</Badge>
              <CardTitle className="mt-2">Saved items</CardTitle>
              <CardDescription>Your authenticated Postgres records.</CardDescription>
            </div>
            <Badge variant={loading ? "secondary" : hasItems ? "default" : "outline"}>
              {loading ? "Refreshing" : hasItems ? "Live data" : "Empty"}
            </Badge>
          </CardHeader>

          <CardContent className="grid gap-4 p-[18px]">
            {error ? (
              <div className="rounded-2xl border border-[rgba(167,58,42,0.22)] bg-[#f8ddd5] px-4 py-3.5 text-[#7b2317]" role="alert">
                {error}
              </div>
            ) : null}

            {loading ? <p className="text-[var(--muted)]">Loading...</p> : null}

            {hasItems ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {sortedItems.map((item) => (
                  <article className="grid gap-3 rounded-[18px] border border-[rgba(42,29,20,0.08)] bg-[rgba(255,253,249,0.86)] p-4 shadow-[0_6px_16px_rgba(21,18,16,0.04)]" key={item.id}>
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#191513] text-[0.96rem] font-extrabold text-[#fff7ef]" aria-hidden="true">
                        {item.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="grid gap-0.5">
                        <h3 className="m-0 text-[1.04rem] leading-[1.3]">{item.name}</h3>
                        <p className="m-0 text-[0.88rem] text-[var(--muted)]">Created {new Date(item.createdAt).toLocaleString()}</p>
                        <p className="m-0 text-[0.88rem] text-[var(--muted)]">Updated {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "-"}</p>
                      </div>
                    </div>

                    <CardFooter className="flex flex-wrap items-center gap-2">
                      <Button variant="secondary" size="sm" type="button" onClick={() => setEditingItem(item)}>
                        Edit
                      </Button>
                      <DeleteItemButton onDelete={() => void handleDelete(item.id)} busy={busy} />
                    </CardFooter>
                  </article>
                ))}
              </div>
            ) : (
              <div className="grid place-items-center gap-2 px-4 py-7 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-[18px] bg-[#191513] text-2xl leading-none text-[#fff7ef]">+</div>
                <h3 className="m-0 text-xl font-bold">No items yet</h3>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {editingItem ? (
        <EditItemModal
          value={editingItem.name}
          onChange={(name) => setEditingItem({ ...editingItem, name })}
          onSave={handleUpdate}
          onClose={() => setEditingItem(null)}
          busy={busy}
        />
      ) : null}
    </section>
  );
};
