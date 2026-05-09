import type { ManagedUser, ManagedUserCreateInput, ResourceDefinition } from "@imsys/types";

export const usersResource: ResourceDefinition<ManagedUser, ManagedUser, ManagedUserCreateInput> = {
  key: "users",
  labelKey: "resources:usersLabel",
  pageTitleKey: "resources:usersTitle",
  descriptionKey: "resources:usersDescription",
  createLabelKey: "resources:usersCreateLabel",
  createPlaceholderKey: "resources:usersCreatePlaceholder",
  searchPlaceholderKey: "resources:usersSearch",
  totalLabelKey: "resources:usersLabel",
  latestLabelKey: "resources:usersLabel",
  emptyTitleKey: "resources:usersEmptyTitle",
  emptyDescriptionKey: "resources:usersEmptyDescription",
  routeBase: "/users",
  permissions: ["read", "create", "update"],
  columns: [],
  filters: [],
  sorts: [],
  formFields: [],
  detailSections: [],
  bulkActions: []
};
