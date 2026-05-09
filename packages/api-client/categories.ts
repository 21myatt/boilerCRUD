import type { Category, CategoryCreateInput, CategoryUpdateInput } from "@imsys/types";

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

export const getCategories = async (baseUrl: string, options?: RequestOptions): Promise<Category[]> => {
  const body = await requestEnvelope<Category[]>(baseUrl, "/categories", undefined, options);
  return body.data ?? [];
};

export const createCategory = async (
  baseUrl: string,
  input: CategoryCreateInput,
  options?: RequestOptions
): Promise<Category> => {
  const body = await requestEnvelope<Category>(baseUrl, "/categories", {
    method: "POST",
    body: JSON.stringify(input)
  }, options);

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
    body: JSON.stringify(input)
  }, options);

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
