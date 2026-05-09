import { useMemo } from "react";
import { createUsersClient } from "@imsys/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ManagedUserCreateInput, ManagedUserUpdateInput } from "@imsys/types";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export const useUsersResource = (accessToken: string | null) => {
  const queryClient = useQueryClient();
  const client = useMemo(
    () => createUsersClient(apiUrl, { getAccessToken: () => accessToken }),
    [accessToken]
  );

  const usersQuery = useQuery({
    queryKey: ["users", accessToken],
    queryFn: () => client.getUsers(),
    enabled: Boolean(accessToken)
  });

  const createUserMutation = useMutation({
    mutationFn: (input: ManagedUserCreateInput) => client.createUser(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users", accessToken] });
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: ManagedUserUpdateInput }) =>
      client.updateUser(id, input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users", accessToken] });
    }
  });

  return {
    usersQuery,
    createUserMutation,
    updateUserMutation
  };
};
