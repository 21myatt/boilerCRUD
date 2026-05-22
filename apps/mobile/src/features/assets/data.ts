import type { SupabaseClient } from "@supabase/supabase-js";
import type { Asset } from "@imsys/types";
import {
  buildAssetObjectPath,
  CMS_ASSET_BUCKET,
  inferAssetKind
} from "@imsys/client";
import { normalizeAppEnv } from "../../lib/app-env";

type AssetRow = {
  id: string;
  user_id: string;
  bucket_id: string;
  path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  kind: Asset["kind"];
  title: string | null;
  alt_text: string | null;
  created_at: string;
  updated_at: string;
};

const assetSelectClause = `
  id,
  user_id,
  bucket_id,
  path,
  file_name,
  mime_type,
  size_bytes,
  kind,
  title,
  alt_text,
  created_at,
  updated_at
`;

const mapAssetRow = (row: AssetRow): Asset => ({
  id: row.id,
  userId: row.user_id,
  bucketId: row.bucket_id,
  path: row.path,
  fileName: row.file_name,
  mimeType: row.mime_type,
  sizeBytes: row.size_bytes,
  kind: row.kind,
  title: row.title,
  altText: row.alt_text,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

const appEnv = normalizeAppEnv(process.env.EXPO_PUBLIC_APP_ENV ?? process.env.NODE_ENV);

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

export const listAssets = async (client: SupabaseClient | null): Promise<Asset[]> => {
  const activeClient = requireClient(client);
  const { data, error } = await activeClient
    .from("assets")
    .select(assetSelectClause)
    .order("created_at", { ascending: false });

  if (error) {
    throw toError(error, "Failed to load assets");
  }

  return (data ?? []).map((row) => mapAssetRow(row as AssetRow));
};

const insertAssetRecord = async (
  client: SupabaseClient,
  input: {
    bucketId: string;
    path: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    kind: Asset["kind"];
    title?: string;
    altText?: string;
  }
) => {
  const { data, error } = await client
    .from("assets")
    .insert({
      app_env: appEnv,
      bucket_id: input.bucketId,
      path: input.path,
      file_name: input.fileName,
      mime_type: input.mimeType,
      size_bytes: input.sizeBytes,
      kind: input.kind,
      title: input.title ?? null,
      alt_text: input.altText ?? null
    })
    .select(assetSelectClause)
    .single();

  if (error) {
    throw toError(error, "Failed to save asset metadata");
  }

  return mapAssetRow(data as AssetRow);
};

export type MobileUploadAssetInput = {
  uri: string;
  fileName: string;
  mimeType?: string | null;
  sizeBytes?: number | null;
  title?: string;
  altText?: string;
};

export const uploadAsset = async (
  client: SupabaseClient | null,
  userId: string,
  file: MobileUploadAssetInput
): Promise<Asset> => {
  const activeClient = requireClient(client);
  const objectPath = buildAssetObjectPath(appEnv, userId, file.fileName);
  const mimeType = file.mimeType || "application/octet-stream";
  const response = await fetch(file.uri);

  if (!response.ok) {
    throw new Error("Failed to read asset file");
  }

  const arrayBuffer = await response.arrayBuffer();

  const { error: uploadError } = await activeClient.storage.from(CMS_ASSET_BUCKET).upload(objectPath, arrayBuffer, {
    cacheControl: "3600",
    contentType: mimeType,
    upsert: false
  });

  if (uploadError) {
    throw toError(uploadError, "Failed to upload asset");
  }

  try {
    return await insertAssetRecord(activeClient, {
      bucketId: CMS_ASSET_BUCKET,
      path: objectPath,
      fileName: file.fileName,
      mimeType,
      sizeBytes: file.sizeBytes ?? arrayBuffer.byteLength,
      kind: inferAssetKind(mimeType),
      title: file.title?.trim() || file.fileName,
      altText: file.altText?.trim() || undefined
    });
  } catch (error) {
    await activeClient.storage.from(CMS_ASSET_BUCKET).remove([objectPath]);
    throw error;
  }
};

export const deleteAsset = async (client: SupabaseClient | null, asset: Asset): Promise<void> => {
  const activeClient = requireClient(client);
  const { error: storageError } = await activeClient.storage.from(asset.bucketId).remove([asset.path]);

  if (storageError) {
    throw toError(storageError, "Failed to delete asset file");
  }

  const { error: recordError } = await activeClient.from("assets").delete().eq("id", asset.id);

  if (recordError) {
    throw toError(recordError, "Failed to delete asset metadata");
  }
};
