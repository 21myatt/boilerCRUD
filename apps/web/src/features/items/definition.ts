import type { ResourceDefinition } from "@imsys/types";
import type { Item } from "@imsys/types";

export type ItemFormValues = {
  name: string;
};

export const itemsResource: ResourceDefinition<Item, Item, ItemFormValues> = {
  key: "items",
  labelKey: "resources:itemsLabel",
  pageTitleKey: "resources:itemsTitle",
  descriptionKey: "resources:itemsDescription",
  createLabelKey: "resources:itemsCreateLabel",
  createPlaceholderKey: "resources:itemsCreatePlaceholder",
  searchPlaceholderKey: "resources:itemsSearch",
  totalLabelKey: "resources:itemsTotal",
  latestLabelKey: "resources:itemsLatestUpdate",
  emptyTitleKey: "resources:itemsEmptyTitle",
  emptyDescriptionKey: "resources:itemsEmptyDescription",
  routeBase: "/items",
  permissions: ["read", "create", "update", "delete"],
  columns: [
    {
      id: "name",
      headerKey: "resources:itemsNameColumn",
      accessor: (item) => item.name
    },
    {
      id: "createdAt",
      headerKey: "resources:itemsCreatedColumn",
      accessor: (item) => item.createdAt
    },
    {
      id: "updatedAt",
      headerKey: "resources:itemsUpdatedColumn",
      accessor: (item) => item.updatedAt ?? item.createdAt
    }
  ],
  filters: [
    {
      key: "search",
      labelKey: "resources:itemsSearch",
      type: "text"
    }
  ],
  sorts: [
    {
      key: "newest",
      labelKey: "resources:itemsLatestUpdate"
    }
  ],
  formFields: [
    {
      key: "name",
      labelKey: "resources:itemsCreateLabel",
      placeholderKey: "resources:itemsCreatePlaceholder",
      input: "text",
      required: true
    }
  ],
  detailSections: [],
  bulkActions: []
};
