import { useMemo } from "react";
import type { Session } from "@supabase/supabase-js";
import { useResourceCollection } from "@imsys/client";
import type { ItemCreateInput, ItemUpdateInput } from "@imsys/types";
import { createAuthorizedSupabaseClient } from "../../lib/supabase";
import { createItem, deleteItem, listItems, updateItem } from "./data";

export const useItemsResource = (session: Session | null) => {
  const accessToken = session?.access_token ?? null;
  const client = useMemo(
    () => (accessToken ? createAuthorizedSupabaseClient(accessToken) : null),
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
    list: async () => listItems(client),
    create: async (input: ItemCreateInput) => createItem(client, input),
    update: async ({ id, ...input }: { id: string } & ItemUpdateInput) => updateItem(client, id, input),
    remove: async (id: string) => deleteItem(client, id)
  });

  return {
    itemsQuery,
    createItemMutation,
    updateItemMutation,
    deleteItemMutation
  };
};
