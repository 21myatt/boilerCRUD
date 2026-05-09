import type { Item, ItemCreateInput, ItemUpdateInput } from "@imsys/types";

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

export const getItems = async (baseUrl: string, options?: RequestOptions): Promise<Item[]> => {
  const body = await requestEnvelope<Item[]>(baseUrl, "/items", undefined, options);
  return body.data ?? [];
};

export const createItem = async (
  baseUrl: string,
  input: ItemCreateInput,
  options?: RequestOptions
): Promise<Item> => {
  const body = await requestEnvelope<Item>(baseUrl, "/items", {
    method: "POST",
    body: JSON.stringify(input)
  }, options);

  return body.data as Item;
};

export const updateItem = async (
  baseUrl: string,
  id: string,
  input: ItemUpdateInput,
  options?: RequestOptions
): Promise<Item> => {
  const body = await requestEnvelope<Item>(baseUrl, `/items/${id}`, {
    method: "PUT",
    body: JSON.stringify(input)
  }, options);

  return body.data as Item;
};

export const deleteItem = async (
  baseUrl: string,
  id: string,
  options?: RequestOptions
): Promise<void> => {
  await requestEnvelope<void>(baseUrl, `/items/${id}`, {
    method: "DELETE"
  }, options);
};

export const createItemsClient = (baseUrl: string, options?: RequestOptions) => ({
  getItems: () => getItems(baseUrl, options),
  createItem: (input: ItemCreateInput) => createItem(baseUrl, input, options),
  updateItem: (id: string, input: ItemUpdateInput) =>
    updateItem(baseUrl, id, input, options),
  deleteItem: (id: string) => deleteItem(baseUrl, id, options)
});
