import { createRemoteJWKSet, jwtVerify } from "jose";
import { getCmsRoleForUser, type CmsRole } from "./roles";

export type AuthenticatedUser = {
  id: string;
  email?: string;
  role?: string;
  cmsRole: CmsRole;
  disabled: boolean;
};

export type VerifiedAuthToken = {
  id: string;
  email?: string;
  role?: string;
  appMetadata: unknown;
};

export class AuthError extends Error {}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

const getSupabaseUrl = () => {
  const supabaseUrl = process.env.SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL is required");
  }

  return supabaseUrl.replace(/\/$/, "");
};

const getJwks = () => {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${getSupabaseUrl()}/auth/v1/.well-known/jwks.json`));
  }

  return jwks;
};

const getBearerToken = (authorizationHeader?: string) => {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice("Bearer ".length).trim();
};

export const verifyAccessToken = async (authorizationHeader?: string): Promise<VerifiedAuthToken> => {
  const token = getBearerToken(authorizationHeader);

  if (!token) {
    throw new AuthError("Missing bearer token");
  }

  try {
    const supabaseUrl = getSupabaseUrl();
    const { payload } = await jwtVerify(token, getJwks(), {
      issuer: `${supabaseUrl}/auth/v1`
    });

    if (typeof payload.sub !== "string" || !payload.sub) {
      throw new AuthError("Invalid auth token subject");
    }

    return {
      id: payload.sub,
      email: typeof payload.email === "string" ? payload.email : undefined,
      role: typeof payload.role === "string" ? payload.role : undefined,
      appMetadata: typeof payload.app_metadata === "object" ? payload.app_metadata : null
    };
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "Invalid or expired auth token";
    throw new AuthError(message);
  }
};

export const buildAuthenticatedUser = (
  identity: VerifiedAuthToken,
  profile?: { role: CmsRole; disabled: boolean } | null
): AuthenticatedUser => ({
  id: identity.id,
  email: identity.email,
  role: identity.role,
  cmsRole: getCmsRoleForUser({
    email: identity.email,
    profileRole: profile?.role,
    appMetadata: identity.appMetadata,
    fallbackRole: "viewer"
  }),
  disabled: profile?.disabled ?? false
});

export const requireAuth = async (
  authorizationHeader?: string,
  profile?: { role: CmsRole; disabled: boolean } | null
): Promise<AuthenticatedUser> => buildAuthenticatedUser(
  await verifyAccessToken(authorizationHeader),
  profile
);
