import type { Asset, ResourceDefinition } from "@imsys/types";

export type AssetUploadValues = {
  title: string;
  altText: string;
};

export const assetsResource: ResourceDefinition<Asset, Asset, AssetUploadValues> = {
  key: "assets",
  labelKey: "resources:assetsLabel",
  pageTitleKey: "resources:assetsTitle",
  descriptionKey: "resources:assetsDescription",
  createLabelKey: "resources:assetsCreateLabel",
  createPlaceholderKey: "resources:assetsCreatePlaceholder",
  searchPlaceholderKey: "resources:assetsSearch",
  totalLabelKey: "resources:assetsTotal",
  latestLabelKey: "resources:assetsLatestUpdate",
  emptyTitleKey: "resources:assetsEmptyTitle",
  emptyDescriptionKey: "resources:assetsEmptyDescription",
  routeBase: "/assets",
  permissions: ["read", "create", "delete"],
  columns: [
    { id: "fileName", headerKey: "resources:assetsNameColumn", accessor: (asset) => asset.fileName },
    { id: "mimeType", headerKey: "resources:assetsTypeColumn", accessor: (asset) => asset.mimeType },
    { id: "createdAt", headerKey: "resources:assetsCreatedColumn", accessor: (asset) => asset.createdAt }
  ],
  filters: [{ key: "search", labelKey: "resources:assetsSearch", type: "text" }],
  sorts: [{ key: "newest", labelKey: "resources:assetsLatestUpdate" }],
  formFields: [
    {
      key: "title",
      labelKey: "resources:assetsCreateLabel",
      placeholderKey: "resources:assetsCreatePlaceholder",
      input: "text"
    },
    {
      key: "altText",
      labelKey: "resources:assetsAltTextLabel",
      placeholderKey: "resources:assetsAltTextPlaceholder",
      input: "textarea"
    }
  ],
  detailSections: [],
  bulkActions: []
};
