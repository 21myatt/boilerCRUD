import type { ID, Timestamped } from "./common";

export type Item = Timestamped & {
  id: ID;
  name: string;
  categoryId: ID | null;
  updatedAt?: string;
};

export type ItemCreateInput = Pick<Item, "name" | "categoryId">;

export type ItemUpdateInput = Partial<ItemCreateInput>;
