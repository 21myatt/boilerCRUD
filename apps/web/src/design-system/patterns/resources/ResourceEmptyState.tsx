import type { ResourceDefinition } from "@imsys/types";
import { useTranslation } from "react-i18next";

type ResourceEmptyStateProps<TListItem, TDetail, TFormValues> = {
  resource: ResourceDefinition<TListItem, TDetail, TFormValues>;
};

export const ResourceEmptyState = <TListItem, TDetail, TFormValues>({
  resource
}: ResourceEmptyStateProps<TListItem, TDetail, TFormValues>) => {
  const { t } = useTranslation();

  return (
    <div className="grid place-items-center gap-2 px-4 py-7 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-[18px] bg-[#191513] text-2xl leading-none text-[#fff7ef]">+</div>
      <h3 className="m-0 text-xl font-bold">{t(resource.emptyTitleKey)}</h3>
      <p className="m-0 max-w-[42ch] text-[var(--muted)]">{t(resource.emptyDescriptionKey)}</p>
    </div>
  );
};
