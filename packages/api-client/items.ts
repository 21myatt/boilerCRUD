import type { Item, ItemCreateInput, ItemUpdateInput } from "@imsys/types";
import { requestEnvelope, type RequestOptions } from "./request";

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
