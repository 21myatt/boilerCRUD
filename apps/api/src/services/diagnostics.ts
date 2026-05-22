import { sql } from "drizzle-orm";
import { getDb } from "@imsys/db";
import { appSchemaState, profiles } from "@imsys/db/schema";
import { APP_SCHEMA_VERSION } from "@imsys/utils";
import { getAppEnv } from "../lib/app-env";
import { getSupabaseAdminHeaders, getSupabaseAdminUrl } from "../lib/supabase-admin";

const parseJson = async <T>(response: Response): Promise<T> => {
  const body = await response.json() as T | { message?: string; msg?: string };

  if (!response.ok) {
    const message = typeof body === "object" && body
      ? ("message" in body && typeof body.message === "string" ? body.message : undefined)
        ?? ("msg" in body && typeof body.msg === "string" ? body.msg : undefined)
      : undefined;
    throw new Error(message ?? `Request failed with ${response.status}`);
  }

  return body as T;
};

export const buildDiagnosticsPayload = ({
  checkedAt,
  databaseOk,
  authAdminOk,
  storageBucketOk,
  profilesTableOk,
  currentVersion
}: {
  checkedAt: string;
  databaseOk: boolean;
  authAdminOk: boolean;
  storageBucketOk: boolean;
  profilesTableOk: boolean;
  currentVersion: string | null;
}) => ({
  checkedAt,
  checks: {
    database: {
      ok: databaseOk
    },
    authAdmin: {
      ok: authAdminOk
    },
    storageBucket: {
      ok: storageBucketOk
    },
    profilesTable: {
      ok: profilesTableOk
    },
    schemaVersion: {
      ok: currentVersion === APP_SCHEMA_VERSION,
      expected: APP_SCHEMA_VERSION,
      actual: currentVersion
    }
  }
});

export const getDiagnostics = async () => {
  const db = getDb();
  const now = new Date().toISOString();
  const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");

  const dbCheck = await db.execute(sql`select 1 as ok`);
  const schemaRows = await db
    .select()
    .from(appSchemaState)
    .where(sql`${appSchemaState.singletonKey} = 'current'`)
    .limit(1);

  const authResponse = await fetch(getSupabaseAdminUrl("/admin/users?page=1&per_page=1"), {
    headers: getSupabaseAdminHeaders()
  });
  await parseJson(authResponse);

  const storageResponse = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
    headers: {
      ...getSupabaseAdminHeaders(),
      accept: "application/json"
    }
  });
  const storageBuckets = await parseJson<Array<{ id: string; name: string }>>(storageResponse);

  const profileCheck = await db.select({ count: sql<number>`count(*)` }).from(profiles).where(sql`${profiles.appEnv} = ${getAppEnv()}`);
  const currentVersion = schemaRows[0]?.schemaVersion ?? null;
  const profileCount = profileCheck[0]?.count;

  return buildDiagnosticsPayload({
    checkedAt: now,
    databaseOk: Array.isArray(dbCheck.rows) ? dbCheck.rows.length > 0 : true,
    authAdminOk: true,
    storageBucketOk: storageBuckets.some((bucket) => bucket.id === "cms-assets"),
    profilesTableOk: profileCount !== undefined && profileCount !== null,
    currentVersion
  });
};
