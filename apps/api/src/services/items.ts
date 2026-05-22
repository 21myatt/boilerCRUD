import { and, desc, eq } from "drizzle-orm";
import type { Item, ItemCreateInput, ItemUpdateInput } from "@imsys/types";
import { getDb } from "@imsys/db";
import { categories, items } from "@imsys/db/schema";
import { AppError } from "@imsys/utils";
import { getAppEnv } from "../lib/app-env";

const mapRow = (row: typeof items.$inferSelect): Item => ({
  id: row.id,
  name: row.name,
  categoryId: row.categoryId,
  createdAt: new Date(row.createdAt).toISOString(),
  updatedAt: new Date(row.updatedAt).toISOString()
});

const appEnv = () => getAppEnv();

const assertCategoryOwnership = async (userId: string, categoryId: string | null | undefined) => {
  if (!categoryId) {
    return;
  }

  const db = getDb();
  const rows = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId), eq(categories.appEnv, appEnv())))
    .limit(1);

  if (!rows[0]) {
    throw new AppError("Category not found", 404);
  }
};

export const listItems = async (userId: string): Promise<Item[]> => {
  const db = getDb();
  const rows = await db
    .select()
    .from(items)
    .where(and(eq(items.userId, userId), eq(items.appEnv, appEnv())))
    .orderBy(desc(items.createdAt));

  return rows.map(mapRow);
};

export const getItem = async (userId: string, id: string): Promise<Item | null> => {
  const db = getDb();
  const rows = await db
    .select()
    .from(items)
    .where(and(eq(items.id, id), eq(items.userId, userId), eq(items.appEnv, appEnv())))
    .limit(1);

  return rows[0] ? mapRow(rows[0]) : null;
};

export const createItem = async (userId: string, input: ItemCreateInput): Promise<Item> => {
  const db = getDb();
  await assertCategoryOwnership(userId, input.categoryId);
  const row = {
    id: crypto.randomUUID(),
    appEnv: appEnv(),
    userId,
    categoryId: input.categoryId ?? null,
    name: input.name,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await db.insert(items).values(row);
  return mapRow(row);
};

export const updateItem = async (
  userId: string,
  id: string,
  input: ItemUpdateInput
): Promise<Item | null> => {
  const db = getDb();
  const existing = await getItem(userId, id);

  if (!existing) {
    return null;
  }

  const nextName = input.name ?? existing.name;
  const nextCategoryId = input.categoryId === undefined ? existing.categoryId : input.categoryId;
  const updatedAt = new Date();

  await assertCategoryOwnership(userId, nextCategoryId);

  await db
    .update(items)
    .set({
      name: nextName,
      categoryId: nextCategoryId,
      updatedAt
    })
    .where(and(eq(items.id, id), eq(items.userId, userId), eq(items.appEnv, appEnv())));

  return {
    ...existing,
    name: nextName,
    categoryId: nextCategoryId ?? null,
    updatedAt: updatedAt.toISOString()
  };
};

export const deleteItem = async (userId: string, id: string): Promise<boolean> => {
  const db = getDb();
  const existing = await getItem(userId, id);

  if (!existing) {
    return false;
  }

  await db.delete(items).where(and(eq(items.id, id), eq(items.userId, userId), eq(items.appEnv, appEnv())));
  return true;
};
