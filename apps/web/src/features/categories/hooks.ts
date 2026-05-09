import { useMemo } from "react";
import { createCategoriesClient } from "@imsys/api-client";
import { useResourceCollection } from "@imsys/client";
import { useTranslation } from "react-i18next";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export const useCategoriesResource = (accessToken: string | null) => {
  const { t } = useTranslation("errors");
  const client = useMemo(
    () => createCategoriesClient(apiUrl, { getAccessToken: () => accessToken }),
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
    meta: { errorMessage: t("loadCategories") },
    list: async () => client.getCategories(),
    create: async (name: string) => client.createCategory({ name }),
    update: async ({ id, name }: { id: string; name: string }) => client.updateCategory(id, { name }),
    remove: async (id: string) => client.deleteCategory(id)
  });

  return {
    categoriesQuery,
    createCategoryMutation,
    updateCategoryMutation,
    deleteCategoryMutation
  };
};
