import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { appSchemaState, assets, auditLogs, categories, items, profiles } from "./schema";

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

const getDatabaseUrl = () => {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  return databaseUrl;
};

const getPool = () => {
  if (!pool) {
    pool = new Pool({
      connectionString: getDatabaseUrl(),
      ssl: { rejectUnauthorized: false }
    });
  }

  return pool;
};

export const getDb = () => {
  if (!db) {
    db = drizzle(getPool(), {
      schema: { appSchemaState, assets, auditLogs, categories, items, profiles }
    });
  }

  return db;
};
