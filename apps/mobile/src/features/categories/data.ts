import type { SupabaseClient } from "@supabase/supabase-js";
import type { Category, CategoryCreateInput, CategoryUpdateInput } from "@imsys/types";

export type CategoryRow = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export const categoriesSelectClause = "id, name, created_at, updated_at";

export const mapCategoryRow = (row: CategoryRow): Category => ({
  id: row.id,
  name: row.name,
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

export const listCategories = async (client: SupabaseClient | null): Promise<Category[]> => {
  const activeClient = requireClient(client);
  const { data, error } = await activeClient
    .from("categories")
    .select(categoriesSelectClause)
    .order("created_at", { ascending: false });

  if (error) {
    throw toError(error, "Failed to load categories");
  }

  return (data ?? []).map((row) => mapCategoryRow(row as CategoryRow));
};

export const createCategory = async (client: SupabaseClient | null, input: CategoryCreateInput): Promise<Category> => {
  const activeClient = requireClient(client);
  const { data, error } = await activeClient
    .from("categories")
    .insert(input)
    .select(categoriesSelectClause)
    .single();

  if (error) {
    throw toError(error, "Failed to create category");
  }

  return mapCategoryRow(data as CategoryRow);
};

export const updateCategory = async (
  client: SupabaseClient | null,
  id: string,
  input: CategoryUpdateInput
): Promise<Category> => {
  const activeClient = requireClient(client);
  const { data, error } = await activeClient
    .from("categories")
    .update(input)
    .eq("id", id)
    .select(categoriesSelectClause)
    .single();

  if (error) {
    throw toError(error, "Failed to update category");
  }

  return mapCategoryRow(data as CategoryRow);
};

export const deleteCategory = async (client: SupabaseClient | null, id: string): Promise<void> => {
  const activeClient = requireClient(client);
  const { error } = await activeClient.from("categories").delete().eq("id", id);

  if (error) {
    throw toError(error, "Failed to delete category");
  }
};
