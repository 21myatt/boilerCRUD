import type { ReactNode } from "react";
import type { ResourceDefinition } from "@imsys/types";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";

type ResourceCreateCardProps<TListItem, TDetail, TFormValues> = {
  resource: ResourceDefinition<TListItem, TDetail, TFormValues>;
  children: ReactNode;
};

export const ResourceCreateCard = <TListItem, TDetail, TFormValues>({
  resource,
  children
}: ResourceCreateCardProps<TListItem, TDetail, TFormValues>) => {
  const { t } = useTranslation();

  return (
    <Card className="grid gap-3 rounded-[18px] p-[18px]">
      <CardHeader className="grid gap-0">
        <CardTitle>{t(resource.createLabelKey)}</CardTitle>
      </CardHeader>
      <CardContent className="grid items-end gap-2.5 md:grid-cols-[minmax(0,1fr)_auto]">{children}</CardContent>
    </Card>
  );
};
