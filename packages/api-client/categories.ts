import {
  apiEnvelopeSchema,
  categoryCreateInputSchema,
  categoryListSchema,
  categorySchema,
  categoryUpdateInputSchema,
  type Category,
  type CategoryCreateInput,
  type CategoryUpdateInput
} from "@imsys/types";
import { requestEnvelope, type RequestOptions } from "./request";

export const getCategories = async (baseUrl: string, options?: RequestOptions): Promise<Category[]> => {
  const body = await requestEnvelope<Category[]>(
    baseUrl,
    "/categories",
    undefined,
    options,
    apiEnvelopeSchema(categoryListSchema)
  );
  return body.data ?? [];
};

export const createCategory = async (
  baseUrl: string,
  input: CategoryCreateInput,
  options?: RequestOptions
): Promise<Category> => {
  const body = await requestEnvelope<Category>(baseUrl, "/categories", {
    method: "POST",
    body: JSON.stringify(categoryCreateInputSchema.parse(input))
  }, options, apiEnvelopeSchema(categorySchema));

  return body.data as Category;
};

export const updateCategory = async (
  baseUrl: string,
  id: string,
  input: CategoryUpdateInput,
  options?: RequestOptions
): Promise<Category> => {
  const body = await requestEnvelope<Category>(baseUrl, `/categories/${id}`, {
    method: "PUT",
    body: JSON.stringify(categoryUpdateInputSchema.parse(input))
  }, options, apiEnvelopeSchema(categorySchema));

  return body.data as Category;
};

export const deleteCategory = async (
  baseUrl: string,
  id: string,
  options?: RequestOptions
): Promise<void> => {
  await requestEnvelope<void>(baseUrl, `/categories/${id}`, {
    method: "DELETE"
  }, options);
};

export const createCategoriesClient = (baseUrl: string, options?: RequestOptions) => ({
  getCategories: () => getCategories(baseUrl, options),
  createCategory: (input: CategoryCreateInput) => createCategory(baseUrl, input, options),
  updateCategory: (id: string, input: CategoryUpdateInput) =>
    updateCategory(baseUrl, id, input, options),
  deleteCategory: (id: string) => deleteCategory(baseUrl, id, options)
});
