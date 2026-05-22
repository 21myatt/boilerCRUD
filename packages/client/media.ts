export const CMS_ASSET_BUCKET = "cms-assets";

const slugifySegment = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

export const buildAssetObjectPath = (
  appEnv: string,
  userId: string,
  fileName: string,
  now = new Date()
) => {
  const safeName = slugifySegment(fileName) || "upload";
  const safeEnv = slugifySegment(appEnv) || "development";
  return `${safeEnv}/${userId}/${now.toISOString()}-${safeName}`;
};

export const inferAssetKind = (mimeType: string) => {
  if (mimeType.startsWith("image/")) {
    return "image" as const;
  }

  if (
    mimeType.startsWith("application/pdf")
    || mimeType.startsWith("text/")
    || mimeType.includes("document")
  ) {
    return "document" as const;
  }

  return "file" as const;
};
