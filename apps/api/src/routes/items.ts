import { createItemSchema } from "../validators/item";

export const itemsRoute = {
  get: "/items",
  post: "/items",
  put: "/items/:id",
  delete: "/items/:id",
  schema: createItemSchema
};

export const itemIdPattern = /^\/items\/([^/]+)$/;
