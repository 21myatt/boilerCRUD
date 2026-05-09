import { useMemo } from "react";
import type { Session } from "@supabase/supabase-js";
import { useResourceCollection } from "@imsys/client";
import { createAuthorizedSupabaseClient } from "../../lib/supabase";
import { createCategory, deleteCategory, listCategories, updateCategory } from "./data";

export const useCategoriesResource = (session: Session | null) => {
  const accessToken = session?.access_token ?? null;
  const client = useMemo(
    () => (accessToken ? createAuthorizedSupabaseClient(accessToken) : null),
    [accessToken]
  );

  const {
    resourceQuery: categoriesQuery,
    createMutation: createCategoryMutation,
    updateMutation: updateCategoryMutation,
    deleteMutation: deleteCategoryMutation
  } = useResourceCollection({
    resourceKey: "categories",
    scopeKey: accessToken,
    enabled: Boolean(accessToken),
    list: async () => listCategories(client),
    create: async (name: string) => createCategory(client, { name }),
    update: async ({ id, name }: { id: string; name: string }) => updateCategory(client, id, { name }),
    remove: async (id: string) => deleteCategory(client, id)
  });

  return {
    categoriesQuery,
    createCategoryMutation,
    updateCategoryMutation,
    deleteCategoryMutation
  };
};
