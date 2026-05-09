import { createItem, deleteItem, getItem, listItems, updateItem } from "../services/items";

export const itemsController = {
  list: listItems,
  find: getItem,
  create: createItem,
  update: updateItem,
  remove: deleteItem
};
