import { useMemo } from "react";
import type { Session } from "@supabase/supabase-js";
import { useResourceCollection } from "@imsys/client";
import { createAuthorizedSupabaseClient } from "../../lib/supabase";
import { deleteAsset, listAssets, uploadAsset } from "./data";

export const useAssetsResource = (session: Session | null) => {
  const accessToken = session?.access_token ?? null;
  const userId = session?.user.id ?? null;
  const client = useMemo(
    () => (accessToken ? createAuthorizedSupabaseClient(accessToken) : null),
    [accessToken]
  );

  const {
    resourceQuery: assetsQuery,
    createMutation: uploadAssetMutation,
    deleteMutation: deleteAssetMutation
  } = useResourceCollection({
    resourceKey: "assets",
    scopeKey: accessToken,
    enabled: Boolean(accessToken),
    list: async () => listAssets(client),
    create: async (input: {
      uri: string;
      fileName: string;
      mimeType?: string | null;
      sizeBytes?: number | null;
      title?: string;
      altText?: string;
    }) => {
      if (!userId) {
        throw new Error("Not signed in");
      }

      return uploadAsset(client, userId, input);
    },
    update: async () => {
      throw new Error("Asset updates are not implemented");
    },
    remove: async (id: string) => {
      const asset = (assetsQuery.data ?? []).find((entry) => entry.id === id);

      if (!asset) {
        throw new Error("Asset not found");
      }

      await deleteAsset(client, asset);
    }
  });

  return {
    assetsQuery,
    uploadAssetMutation,
    deleteAssetMutation
  };
};
