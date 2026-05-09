import type { ResourceDefinition, Category } from "@imsys/types";

export type CategoryFormValues = {
  name: string;
};

export const categoriesResource: ResourceDefinition<Category, Category, CategoryFormValues> = {
  key: "categories",
  labelKey: "resources:categoriesLabel",
  pageTitleKey: "resources:categoriesTitle",
  descriptionKey: "resources:categoriesDescription",
  createLabelKey: "resources:categoriesCreateLabel",
  createPlaceholderKey: "resources:categoriesCreatePlaceholder",
  searchPlaceholderKey: "resources:categoriesSearch",
  totalLabelKey: "resources:categoriesTotal",
  latestLabelKey: "resources:categoriesLatestUpdate",
  emptyTitleKey: "resources:categoriesEmptyTitle",
  emptyDescriptionKey: "resources:categoriesEmptyDescription",
  routeBase: "/categories",
  permissions: ["read", "create", "update", "delete"],
  columns: [
    { id: "name", headerKey: "resources:categoriesNameColumn", accessor: (category) => category.name },
    { id: "createdAt", headerKey: "resources:categoriesCreatedColumn", accessor: (category) => category.createdAt },
    { id: "updatedAt", headerKey: "resources:categoriesUpdatedColumn", accessor: (category) => category.updatedAt ?? category.createdAt }
  ],
  filters: [{ key: "search", labelKey: "resources:categoriesSearch", type: "text" }],
  sorts: [{ key: "newest", labelKey: "resources:categoriesLatestUpdate" }],
  formFields: [
    {
      key: "name",
      labelKey: "resources:categoriesCreateLabel",
      placeholderKey: "resources:categoriesCreatePlaceholder",
      input: "text",
      required: true
    }
  ],
  detailSections: [],
  bulkActions: []
};
