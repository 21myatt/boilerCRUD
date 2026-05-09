import type { ResourceDefinition, Item } from "@imsys/types";

export type ItemFormValues = {
  name: string;
};

export const itemsResource: ResourceDefinition<Item, Item, ItemFormValues> = {
  key: "items",
  labelKey: "items",
  pageTitleKey: "items",
  descriptionKey: "itemsDescription",
  createLabelKey: "createItem",
  createPlaceholderKey: "itemPlaceholder",
  searchPlaceholderKey: "searchItems",
  totalLabelKey: "totalItems",
  latestLabelKey: "latestUpdate",
  emptyTitleKey: "noItems",
  emptyDescriptionKey: "noItemsDescription",
  routeBase: "items",
  permissions: ["read", "create", "update", "delete"],
  columns: [
    {
      id: "name",
      headerKey: "items",
      accessor: (item) => item.name
    }
  ],
  filters: [
    {
      key: "search",
      labelKey: "searchItems",
      type: "text"
    }
  ],
  sorts: [
    {
      key: "latest",
      labelKey: "latestUpdate"
    }
  ],
  formFields: [
    {
      key: "name",
      labelKey: "createItem",
      placeholderKey: "itemPlaceholder",
      input: "text",
      required: true
    }
  ],
  detailSections: [],
  bulkActions: []
};
