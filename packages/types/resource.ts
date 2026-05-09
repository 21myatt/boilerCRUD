export type ResourceAction = "read" | "create" | "update" | "delete";

export type ResourceFilterType = "text" | "select";

export type ResourceFilterOption = {
  labelKey: string;
  value: string;
};

export type ResourceFilterDefinition = {
  key: string;
  labelKey: string;
  type: ResourceFilterType;
  options?: ResourceFilterOption[];
};

export type ResourceSortDefinition = {
  key: string;
  labelKey: string;
};

export type ResourceColumnDefinition<TItem> = {
  id: string;
  headerKey: string;
  accessor: (item: TItem) => string;
};

export type ResourceFieldDefinition<TFormValues> = {
  key: keyof TFormValues & string;
  labelKey: string;
  placeholderKey?: string;
  input: "text" | "textarea";
  required?: boolean;
};

export type ResourceSectionDefinition<TDetail> = {
  id: string;
  titleKey: string;
  render?: (detail: TDetail) => string;
};

export type ResourceBulkActionDefinition = {
  id: string;
  labelKey: string;
  permission: ResourceAction;
};

export type ResourceDefinition<TListItem, TDetail = TListItem, TFormValues = Record<string, unknown>> = {
  key: string;
  labelKey: string;
  pageTitleKey: string;
  descriptionKey: string;
  createLabelKey: string;
  createPlaceholderKey: string;
  searchPlaceholderKey: string;
  totalLabelKey: string;
  latestLabelKey: string;
  emptyTitleKey: string;
  emptyDescriptionKey: string;
  routeBase: string;
  permissions: ResourceAction[];
  columns: ResourceColumnDefinition<TListItem>[];
  filters: ResourceFilterDefinition[];
  sorts: ResourceSortDefinition[];
  formFields: ResourceFieldDefinition<TFormValues>[];
  detailSections: ResourceSectionDefinition<TDetail>[];
  bulkActions: ResourceBulkActionDefinition[];
};
