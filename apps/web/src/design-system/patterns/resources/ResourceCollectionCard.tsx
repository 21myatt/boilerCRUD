import type { ReactNode } from "react";
import type { ResourceDefinition } from "@imsys/types";
import { useTranslation } from "react-i18next";
import { Badge } from "../../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";

type ResourceCollectionCardProps<TListItem, TDetail, TFormValues> = {
  resource: ResourceDefinition<TListItem, TDetail, TFormValues>;
  totalCount: number;
  isFetching: boolean;
  toolbar: ReactNode;
  error?: ReactNode;
  loading?: ReactNode;
  empty?: ReactNode;
  children?: ReactNode;
};

export const ResourceCollectionCard = <TListItem, TDetail, TFormValues>({
  resource,
  toolbar,
  error,
  loading,
  empty,
  children
}: ResourceCollectionCardProps<TListItem, TDetail, TFormValues>) => {
  const { t } = useTranslation();
  const title = t(resource.pageTitleKey);

  return (
    <Card className="rounded-[20px]">
      <CardHeader className="flex items-start justify-start gap-3 p-[18px] pb-0">
        <div>
          <Badge variant="outline">{title}</Badge>
          <CardTitle className="mt-2">{title}</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="grid gap-3 p-[18px]">
        {toolbar}
        {error}
        {loading}
        {empty}
        {children}
      </CardContent>
    </Card>
  );
};
