import type { ID, Timestamped } from "./common";

export type Category = Timestamped & {
  id: ID;
  name: string;
  updatedAt?: string;
};

export type CategoryCreateInput = Pick<Category, "name">;

export type CategoryUpdateInput = Partial<CategoryCreateInput>;
