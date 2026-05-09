import type { ID, Timestamped } from "./common";

export type AssetKind = "image" | "document" | "file";

export type Asset = Timestamped & {
  id: ID;
  userId: ID;
  bucketId: string;
  path: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  kind: AssetKind;
  title?: string | null;
  altText?: string | null;
  updatedAt?: string;
};

export type AssetCreateInput = Pick<
  Asset,
  "bucketId" | "path" | "fileName" | "mimeType" | "sizeBytes" | "kind"
> & {
  title?: string | null;
  altText?: string | null;
};
