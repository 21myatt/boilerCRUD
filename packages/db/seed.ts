import { db, initDb } from "./client";
import { items } from "./schema";

const normalizeAppEnv = (value?: string | null) => {
  const normalized = value?.trim().toLowerCase();
  return normalized === "staging" || normalized === "production" ? normalized : "development";
};

export const seed = async () => {
  await initDb();
  const appEnv = normalizeAppEnv(process.env.APP_ENV ?? process.env.NODE_ENV);
  const existing = await db.select().from(items).limit(1);

  if (existing.length > 0) {
    return;
  }

  await db.insert(items).values([
    {
      id: crypto.randomUUID(),
      appEnv,
      name: "First item",
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ]);
};
