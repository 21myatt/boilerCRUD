import type { Asset, ResourceDefinition } from "@imsys/types";

export const assetsResource: ResourceDefinition<Asset, Asset, Record<string, never>> = {
  key: "assets",
  labelKey: "assets",
  pageTitleKey: "assets",
  descriptionKey: "assetsDescription",
  createLabelKey: "uploadAsset",
  createPlaceholderKey: "uploadAsset",
  searchPlaceholderKey: "searchAssets",
  totalLabelKey: "totalAssets",
  latestLabelKey: "latestUpdate",
  emptyTitleKey: "noAssets",
  emptyDescriptionKey: "noAssetsDescription",
  routeBase: "assets",
  permissions: ["read", "create", "delete"],
  columns: [{ id: "fileName", headerKey: "assets", accessor: (asset) => asset.fileName }],
  filters: [{ key: "search", labelKey: "searchAssets", type: "text" }],
  sorts: [{ key: "latest", labelKey: "latestUpdate" }],
  formFields: [],
  detailSections: [],
  bulkActions: []
};
