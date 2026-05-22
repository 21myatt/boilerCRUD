import {
  apiEnvelopeSchema,
  managedUserCreateInputSchema,
  managedUserListSchema,
  managedUserSchema,
  managedUserUpdateInputSchema,
  type ManagedUser,
  type ManagedUserCreateInput,
  type ManagedUserUpdateInput
} from "@imsys/types";
import { requestEnvelope, type RequestOptions } from "./request";

export const getUsers = async (
  baseUrl: string,
  options?: RequestOptions
): Promise<ManagedUser[]> => {
  const body = await requestEnvelope<ManagedUser[]>(
    baseUrl,
    "/users",
    undefined,
    options,
    apiEnvelopeSchema(managedUserListSchema)
  );
  return body.data ?? [];
};

export const createUser = async (
  baseUrl: string,
  input: ManagedUserCreateInput,
  options?: RequestOptions
): Promise<ManagedUser> => {
  const body = await requestEnvelope<ManagedUser>(baseUrl, "/users", {
    method: "POST",
    body: JSON.stringify(managedUserCreateInputSchema.parse(input))
  }, options, apiEnvelopeSchema(managedUserSchema));

  return body.data as ManagedUser;
};

export const updateUser = async (
  baseUrl: string,
  id: string,
  input: ManagedUserUpdateInput,
  options?: RequestOptions
): Promise<ManagedUser> => {
  const body = await requestEnvelope<ManagedUser>(baseUrl, `/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(managedUserUpdateInputSchema.parse(input))
  }, options, apiEnvelopeSchema(managedUserSchema));

  return body.data as ManagedUser;
};

export const createUsersClient = (baseUrl: string, options?: RequestOptions) => ({
  getUsers: () => getUsers(baseUrl, options),
  createUser: (input: ManagedUserCreateInput) => createUser(baseUrl, input, options),
  updateUser: (id: string, input: ManagedUserUpdateInput) => updateUser(baseUrl, id, input, options)
});
