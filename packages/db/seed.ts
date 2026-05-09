import { db, initDb } from "./client";
import { items } from "./schema";

export const seed = async () => {
  await initDb();
  const existing = await db.select().from(items).limit(1);

  if (existing.length > 0) {
    return;
  }

  await db.insert(items).values([
    {
      id: crypto.randomUUID(),
      name: "First item",
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]);
};
