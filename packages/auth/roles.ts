export const roles = ["admin", "editor", "reviewer", "viewer"] as const;
export const ADMIN_EMAIL = "admin@local.dev";
export const VIEWER_EMAIL = "viewer@local.dev";

export type CmsRole = (typeof roles)[number];
export type BootstrapOverrideMode = "auto" | "enabled" | "disabled";

const legacyRoleMap = {
  manager: "editor",
  user: "viewer"
} as const satisfies Record<string, CmsRole>;

export const normalizeCmsRole = (value: unknown): CmsRole | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (roles.includes(normalizedValue as CmsRole)) {
    return normalizedValue as CmsRole;
  }

  return legacyRoleMap[normalizedValue as keyof typeof legacyRoleMap] ?? null;
};

const getNodeEnv = () =>
  typeof process !== "undefined" && process?.env
    ? process.env.NODE_ENV
    : undefined;

const shouldAllowBootstrapOverride = (mode: BootstrapOverrideMode = "auto") => {
  if (mode === "enabled") {
    return true;
  }

  if (mode === "disabled") {
    return false;
  }

  const nodeEnv = getNodeEnv();
  return nodeEnv === "development" || nodeEnv === "test";
};

const normalizeEmail = (value?: string | null) => value?.trim().toLowerCase() ?? "";

export const isProtectedBootstrapEmail = (
  email?: string | null,
  mode: BootstrapOverrideMode = "auto"
) => {
  if (!shouldAllowBootstrapOverride(mode)) {
    return false;
  }

  const normalizedEmail = normalizeEmail(email);
  return normalizedEmail === ADMIN_EMAIL || normalizedEmail === VIEWER_EMAIL;
};

export const getBootstrapCmsRole = (
  email?: string | null,
  mode: BootstrapOverrideMode = "auto"
): CmsRole | null => {
  if (!shouldAllowBootstrapOverride(mode)) {
    return null;
  }

  const normalizedEmail = normalizeEmail(email);

  if (normalizedEmail === ADMIN_EMAIL) {
    return "admin";
  }

  if (normalizedEmail === VIEWER_EMAIL) {
    return "viewer";
  }

  return null;
};

export const getCmsRoleFromAppMetadata = (
  appMetadata: unknown,
  fallbackRole: CmsRole = "viewer"
): CmsRole => {
  if (!appMetadata || typeof appMetadata !== "object") {
    return fallbackRole;
  }

  const record = appMetadata as Record<string, unknown>;

  const directRole = normalizeCmsRole(record.cmsRole)
    ?? normalizeCmsRole(record.cms_role)
    ?? normalizeCmsRole(record.role);

  if (directRole) {
    return directRole;
  }

  if (Array.isArray(record.roles)) {
    for (const candidate of record.roles) {
      const role = normalizeCmsRole(candidate);

      if (role) {
        return role;
      }
    }
  }

  return fallbackRole;
};

export const getCmsRoleForUser = ({
  email,
  profileRole,
  appMetadata,
  fallbackRole = "viewer",
  bootstrapOverrideMode = "auto"
}: {
  email?: string | null;
  profileRole?: unknown;
  appMetadata: unknown;
  fallbackRole?: CmsRole;
  bootstrapOverrideMode?: BootstrapOverrideMode;
}): CmsRole => {
  const bootstrapRole = getBootstrapCmsRole(email, bootstrapOverrideMode);

  if (bootstrapRole) {
    return bootstrapRole;
  }

  const resolvedProfileRole = normalizeCmsRole(profileRole);

  if (resolvedProfileRole) {
    return resolvedProfileRole;
  }

  return fallbackRole;
};
