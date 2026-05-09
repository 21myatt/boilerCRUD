import { and, desc, eq } from "drizzle-orm";
import type { Category, CategoryCreateInput, CategoryUpdateInput } from "@imsys/types";
import { getDb } from "@imsys/db";
import { categories } from "@imsys/db/schema";

const mapRow = (row: typeof categories.$inferSelect): Category => ({
  id: row.id,
  name: row.name,
  createdAt: new Date(row.createdAt).toISOString(),
  updatedAt: new Date(row.updatedAt).toISOString()
});

export const listCategories = async (userId: string): Promise<Category[]> => {
  const db = getDb();
  const rows = await db
    .select()
    .from(categories)
    .where(eq(categories.userId, userId))
    .orderBy(desc(categories.createdAt));

  return rows.map(mapRow);
};

export const getCategory = async (userId: string, id: string): Promise<Category | null> => {
  const db = getDb();
  const rows = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)))
    .limit(1);

  return rows[0] ? mapRow(rows[0]) : null;
};

export const createCategory = async (userId: string, input: CategoryCreateInput): Promise<Category> => {
  const db = getDb();
  const row = {
    id: crypto.randomUUID(),
    userId,
    name: input.name,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  await db.insert(categories).values(row);
  return mapRow(row);
};

export const updateCategory = async (
  userId: string,
  id: string,
  input: CategoryUpdateInput
): Promise<Category | null> => {
  const db = getDb();
  const existing = await getCategory(userId, id);

  if (!existing) {
    return null;
  }

  const nextName = input.name ?? existing.name;
  const updatedAt = new Date();

  await db
    .update(categories)
    .set({
      name: nextName,
      updatedAt
    })
    .where(and(eq(categories.id, id), eq(categories.userId, userId)));

  return {
    ...existing,
    name: nextName,
    updatedAt: updatedAt.toISOString()
  };
};

export const deleteCategory = async (userId: string, id: string): Promise<boolean> => {
  const db = getDb();
  const existing = await getCategory(userId, id);

  if (!existing) {
    return false;
  }

  await db.delete(categories).where(and(eq(categories.id, id), eq(categories.userId, userId)));
  return true;
};
