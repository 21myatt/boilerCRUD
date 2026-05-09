import type { ResourceDefinition } from "@imsys/types";
import { useTranslation } from "react-i18next";

type ResourcePageHeaderProps<TListItem, TDetail, TFormValues> = {
  resource: ResourceDefinition<TListItem, TDetail, TFormValues>;
  totalCount: number;
  latestLabel: string;
};

export const ResourcePageHeader = <TListItem, TDetail, TFormValues>({
  resource
}: ResourcePageHeaderProps<TListItem, TDetail, TFormValues>) => {
  const { t } = useTranslation();

  return (
    <div className="mb-2 flex justify-start gap-3">
      <div className="grid max-w-[680px] gap-1">
        <p className="m-0 text-[11px] font-extrabold uppercase tracking-[0.18em] text-[#8d6743]">{t(resource.labelKey)}</p>
        <h1 className="m-0 text-[clamp(2rem,3.6vw,3.6rem)] leading-none tracking-[-0.05em]">{t(resource.pageTitleKey)}</h1>
      </div>
    </div>
  );
};
