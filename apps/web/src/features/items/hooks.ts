import { useMemo } from "react";
import { createItemsClient } from "@imsys/api-client";
import { useResourceCollection } from "@imsys/client";
import type { ItemCreateInput, ItemUpdateInput } from "@imsys/types";
import { useTranslation } from "react-i18next";
import { apiBaseUrl } from "../../lib/api-base-url";

export const useItemsResource = (accessToken: string | null) => {
  const { t } = useTranslation("errors");
  const client = useMemo(
    () => createItemsClient(apiBaseUrl, { getAccessToken: () => accessToken }),
    [accessToken]
  );

  const {
    resourceQuery: itemsQuery,
    createMutation: createItemMutation,
    updateMutation: updateItemMutation,
    deleteMutation: deleteItemMutation
  } = useResourceCollection({
    resourceKey: "items",
    scopeKey: accessToken,
    enabled: Boolean(accessToken),
    meta: {
      errorMessage: t("loadItems")
    },
    list: async () => client.getItems(),
    create: async (input: ItemCreateInput) => client.createItem(input),
    update: async ({ id, ...input }: { id: string } & ItemUpdateInput) => client.updateItem(id, input),
    remove: async (id: string) => client.deleteItem(id)
  });

  return {
    itemsQuery,
    createItemMutation,
    updateItemMutation,
    deleteItemMutation
  };
};
