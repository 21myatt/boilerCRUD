import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@imsys/db";
import { profiles } from "@imsys/db/schema";
import type { ManagedUserRole, Profile } from "@imsys/types";
import type { VerifiedAuthToken } from "@imsys/auth/middleware";
import { getBootstrapCmsRole, normalizeCmsRole } from "@imsys/auth";
import { logger } from "@imsys/utils";
import { getAppEnv } from "../lib/app-env";
import { getSupabaseAdminHeaders, getSupabaseAdminUrl } from "../lib/supabase-admin";

type SupabaseAuthUserResponse = {
  user: {
    email?: string;
    banned_until?: string | null;
  };
};

const mapProfile = (row: typeof profiles.$inferSelect): Profile => ({
  id: row.id,
  email: row.email,
  role: normalizeCmsRole(row.role) ?? "viewer",
  disabled: Boolean(row.disabled),
  createdAt: new Date(row.createdAt).toISOString(),
  updatedAt: new Date(row.updatedAt).toISOString()
});

type ProfileStoreRow = {
  id: string;
  appEnv: string;
  email: string;
  role: string;
  disabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type ProfileStore = {
  getById: (id: string, appEnv: string) => Promise<ProfileStoreRow | null>;
  list: (appEnv: string) => Promise<ProfileStoreRow[]>;
  upsert: (row: {
    id: string;
    appEnv: string;
    email: string;
    role: string;
    disabled: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) => Promise<void>;
};

const parseResponse = async <T>(response: Response): Promise<T> => {
  const body = await response.json() as T | { message?: string };

  if (!response.ok) {
    const message = typeof body === "object" && body && "message" in body && typeof body.message === "string"
      ? body.message
      : `Supabase admin request failed with ${response.status}`;
    throw new Error(message);
  }

  return body as T;
};

const isBanned = (bannedUntil?: string | null) =>
  Boolean(bannedUntil && bannedUntil !== "none");

const getAuthUserSnapshot = async (id: string) => {
  const response = await fetch(getSupabaseAdminUrl(`/admin/users/${id}`), {
    headers: getSupabaseAdminHeaders()
  });

  if (response.status === 404) {
    return null;
  }

  const payload = await parseResponse<SupabaseAuthUserResponse>(response);
  return payload.user;
};

const defaultProfileStore: ProfileStore = {
  getById: async (id, appEnv) => {
    const db = getDb();
    const rows = await db
      .select()
      .from(profiles)
      .where(and(eq(profiles.id, id), eq(profiles.appEnv, appEnv)))
      .limit(1);

    return rows[0] ?? null;
  },
  list: async (appEnv) => {
    const db = getDb();
    return db
      .select()
      .from(profiles)
      .where(eq(profiles.appEnv, appEnv))
      .orderBy(desc(profiles.createdAt));
  },
  upsert: async (row) => {
    const db = getDb();
    await db
      .insert(profiles)
      .values(row)
      .onConflictDoUpdate({
        target: [profiles.id, profiles.appEnv],
        set: {
          email: row.email,
          role: row.role,
          disabled: row.disabled,
          updatedAt: row.updatedAt
        }
      });
  }
};

let profileStore: ProfileStore = defaultProfileStore;

export const setProfileStoreForTests = (store: ProfileStore | null) => {
  profileStore = store ?? defaultProfileStore;
};

export const getProfileById = async (id: string): Promise<Profile | null> => {
  const row = await profileStore.getById(id, getAppEnv());

  return row ? mapProfile(row) : null;
};

export const listProfiles = async (): Promise<Profile[]> => {
  const rows = await profileStore.list(getAppEnv());
  return rows.map(mapProfile);
};

export const upsertProfile = async ({
  id,
  email,
  role,
  disabled
}: {
  id: string;
  email: string;
  role?: ManagedUserRole;
  disabled?: boolean;
}): Promise<Profile> => {
  const existing = await getProfileById(id);
  const appEnv = getAppEnv();
  const bootstrapRole = getBootstrapCmsRole(email);
  const row = {
    id,
    appEnv,
    email,
    role: bootstrapRole ?? role ?? existing?.role ?? "viewer",
    disabled: disabled ?? existing?.disabled ?? false,
    createdAt: existing ? new Date(existing.createdAt) : new Date(),
    updatedAt: new Date()
  };

  await profileStore.upsert(row);

  const next = await getProfileById(id);

  if (!next) {
    throw new Error("Profile upsert did not return a row");
  }

  return next;
};

export const ensureProfileForIdentity = async (
  identity: VerifiedAuthToken
): Promise<Profile> => {
  const existing = await getProfileById(identity.id);
  const bootstrapRole = getBootstrapCmsRole(identity.email);

  if (existing) {
    if (bootstrapRole && existing.role !== bootstrapRole) {
      const updatedProfile = await upsertProfile({
        id: identity.id,
        email: existing.email,
        role: bootstrapRole,
        disabled: existing.disabled
      });

      logger.warn("Normalized bootstrap profile role for authenticated user", {
        userId: identity.id,
        email: updatedProfile.email,
        role: updatedProfile.role
      });

      return updatedProfile;
    }

    return existing;
  }

  const authUser = await getAuthUserSnapshot(identity.id);
  const email = authUser?.email ?? identity.email ?? "";
  const profile = await upsertProfile({
    id: identity.id,
    email,
    role: getBootstrapCmsRole(email) ?? "viewer",
    disabled: isBanned(authUser?.banned_until)
  });

  logger.warn("Repaired missing profile for authenticated user", {
    userId: identity.id,
    email: profile.email
  });

  return profile;
};
