import type { SupabaseClient } from "@supabase/supabase-js";
import type { Item, ItemCreateInput, ItemUpdateInput } from "@imsys/types";

export type ItemRow = {
  id: string;
  name: string;
  category_id: string | null;
  created_at: string;
  updated_at: string;
};

export const itemsSelectClause = "id, name, category_id, created_at, updated_at";

export const mapItemRow = (row: ItemRow): Item => ({
  id: row.id,
  name: row.name,
  categoryId: row.category_id,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const toError = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error;
  }

  if (typeof error === "object" && error && "message" in error && typeof error.message === "string") {
    return new Error(error.message);
  }

  return new Error(fallback);
};

const requireClient = (client: SupabaseClient | null): SupabaseClient => {
  if (!client) {
    throw new Error("Not signed in");
  }

  return client;
};

export const listItems = async (client: SupabaseClient | null): Promise<Item[]> => {
  const activeClient = requireClient(client);
  const { data, error } = await activeClient
    .from("items")
    .select(itemsSelectClause)
    .order("created_at", { ascending: false });

  if (error) {
    throw toError(error, "Failed to load items");
  }

  return (data ?? []).map((row) => mapItemRow(row as ItemRow));
};

export const createItem = async (
  client: SupabaseClient | null,
  input: ItemCreateInput
): Promise<Item> => {
  const activeClient = requireClient(client);
  const { data, error } = await activeClient
    .from("items")
    .insert({
      name: input.name,
      category_id: input.categoryId
    })
    .select(itemsSelectClause)
    .single();

  if (error) {
    throw toError(error, "Failed to create item");
  }

  return mapItemRow(data as ItemRow);
};

export const updateItem = async (
  client: SupabaseClient | null,
  id: string,
  input: ItemUpdateInput
): Promise<Item> => {
  const updates: Record<string, unknown> = {};

  if (typeof input.name === "string") {
    updates.name = input.name;
  }

  if (input.categoryId !== undefined) {
    updates.category_id = input.categoryId;
  }

  const activeClient = requireClient(client);
  const { data, error } = await activeClient
    .from("items")
    .update(updates)
    .eq("id", id)
    .select(itemsSelectClause)
    .single();

  if (error) {
    throw toError(error, "Failed to update item");
  }

  return mapItemRow(data as ItemRow);
};

export const deleteItem = async (client: SupabaseClient | null, id: string): Promise<void> => {
  const activeClient = requireClient(client);
  const { error } = await activeClient.from("items").delete().eq("id", id);

  if (error) {
    throw toError(error, "Failed to delete item");
  }
};
