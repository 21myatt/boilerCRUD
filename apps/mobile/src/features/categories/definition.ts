import type { ResourceDefinition, Category } from "@imsys/types";

export type CategoryFormValues = {
  name: string;
};

export const categoriesResource: ResourceDefinition<Category, Category, CategoryFormValues> = {
  key: "categories",
  labelKey: "categories",
  pageTitleKey: "categories",
  descriptionKey: "categoriesDescription",
  createLabelKey: "createCategory",
  createPlaceholderKey: "categoryPlaceholder",
  searchPlaceholderKey: "searchCategories",
  totalLabelKey: "totalCategories",
  latestLabelKey: "latestUpdate",
  emptyTitleKey: "noCategories",
  emptyDescriptionKey: "noCategoriesDescription",
  routeBase: "categories",
  permissions: ["read", "create", "update", "delete"],
  columns: [{ id: "name", headerKey: "categories", accessor: (category) => category.name }],
  filters: [{ key: "search", labelKey: "searchCategories", type: "text" }],
  sorts: [{ key: "latest", labelKey: "latestUpdate" }],
  formFields: [
    {
      key: "name",
      labelKey: "createCategory",
      placeholderKey: "categoryPlaceholder",
      input: "text",
      required: true
    }
  ],
  detailSections: [],
  bulkActions: []
};
