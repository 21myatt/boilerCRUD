import type { ID, Timestamped } from "./common";

export type Item = Timestamped & {
  id: ID;
  name: string;
  categoryId: ID | null;
  updatedAt?: string;
};

export type ItemCreateInput = {
  name: string;
  categoryId?: ID | null;
};

export type ItemUpdateInput = Partial<ItemCreateInput>;
