import type { ManagedUser, ManagedUserCreateInput, ManagedUserUpdateInput } from "@imsys/types";

type ApiEnvelope<T> = {
  data?: T;
  error?: string;
};

type RequestOptions = {
  getAccessToken?: () => Promise<string | null> | string | null;
};

const requestEnvelope = async <T>(
  baseUrl: string,
  path: string,
  init?: RequestInit,
  options?: RequestOptions
): Promise<ApiEnvelope<T>> => {
  const accessToken = await options?.getAccessToken?.();
  const targetUrl = new URL(path, baseUrl);
  let response: Response;

  try {
    response = await fetch(targetUrl, {
      headers: {
        "content-type": "application/json",
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        ...(init?.headers ?? {})
      },
      ...init
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Network request failed";
    throw new Error(`${message} while calling ${targetUrl.toString()}`);
  }

  const body = (await response.json()) as ApiEnvelope<T>;

  if (!response.ok) {
    throw new Error(body.error ?? `Request failed with ${response.status}`);
  }

  return body;
};

export const getUsers = async (
  baseUrl: string,
  options?: RequestOptions
): Promise<ManagedUser[]> => {
  const body = await requestEnvelope<ManagedUser[]>(baseUrl, "/users", undefined, options);
  return body.data ?? [];
};

export const createUser = async (
  baseUrl: string,
  input: ManagedUserCreateInput,
  options?: RequestOptions
): Promise<ManagedUser> => {
  const body = await requestEnvelope<ManagedUser>(baseUrl, "/users", {
    method: "POST",
    body: JSON.stringify(input)
  }, options);

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
    body: JSON.stringify(input)
  }, options);

  return body.data as ManagedUser;
};

export const createUsersClient = (baseUrl: string, options?: RequestOptions) => ({
  getUsers: () => getUsers(baseUrl, options),
  createUser: (input: ManagedUserCreateInput) => createUser(baseUrl, input, options),
  updateUser: (id: string, input: ManagedUserUpdateInput) => updateUser(baseUrl, id, input, options)
});
