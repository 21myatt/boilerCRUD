import { createCategorySchema } from "../validators/category";

export const categoriesRoute = {
  get: "/categories",
  post: "/categories",
  put: "/categories/:id",
  delete: "/categories/:id",
  schema: createCategorySchema
};

export const categoryIdPattern = /^\/categories\/([^/]+)$/;
