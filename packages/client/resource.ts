import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type UseResourceCollectionOptions<TItem, TCreateVars, TUpdateVars> = {
  resourceKey: string;
  scopeKey: string | null;
  enabled?: boolean;
  meta?: Record<string, unknown>;
  list: () => Promise<TItem[]>;
  create: (variables: TCreateVars) => Promise<TItem>;
  update: (variables: TUpdateVars) => Promise<TItem>;
  remove: (id: string) => Promise<void>;
};

export const createScopedResourceKey = (resourceKey: string, scopeKey: string | null) => [
  resourceKey,
  scopeKey
] as const;

export const useResourceCollection = <TItem, TCreateVars, TUpdateVars>({
  resourceKey,
  scopeKey,
  enabled = true,
  meta,
  list,
  create,
  update,
  remove
}: UseResourceCollectionOptions<TItem, TCreateVars, TUpdateVars>) => {
  const queryClient = useQueryClient();
  const queryKey = createScopedResourceKey(resourceKey, scopeKey);

  const resourceQuery = useQuery({
    queryKey,
    queryFn: list,
    enabled,
    meta
  });

  const invalidateResource = async () => {
    await queryClient.invalidateQueries({ queryKey });
  };

  const createMutation = useMutation({
    mutationFn: create,
    onSuccess: invalidateResource
  });

  const updateMutation = useMutation({
    mutationFn: update,
    onSuccess: invalidateResource
  });

  const deleteMutation = useMutation({
    mutationFn: remove,
    onSuccess: invalidateResource
  });

  return {
    queryKey,
    resourceQuery,
    createMutation,
    updateMutation,
    deleteMutation,
    invalidateResource
  };
};
