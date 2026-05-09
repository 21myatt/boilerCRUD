import type { Session } from "@supabase/supabase-js";
import { getCmsRoleForUser, type CmsRole } from "./roles";

export const permissions = {
  items: ["read", "create", "update", "delete"],
  categories: ["read", "create", "update", "delete"],
  assets: ["read", "create", "delete"],
  users: ["read", "create", "update"]
} as const;

export type PermissionResource = keyof typeof permissions;
export type PermissionAction<TResource extends PermissionResource = PermissionResource> =
  (typeof permissions)[TResource][number];

export type PermissionMap = {
  [Key in PermissionResource]: readonly PermissionAction<Key>[];
};

const allowAll = <TResource extends PermissionResource>(
  resource: TResource
): readonly PermissionAction<TResource>[] => permissions[resource];

const rolePermissionMap: Record<CmsRole, PermissionMap> = {
  admin: {
    items: allowAll("items"),
    categories: allowAll("categories"),
    assets: allowAll("assets"),
    users: allowAll("users")
  },
  editor: {
    items: allowAll("items"),
    categories: allowAll("categories"),
    assets: ["read", "create", "delete"],
    users: []
  },
  reviewer: {
    items: ["read"],
    categories: ["read"],
    assets: ["read"],
    users: []
  },
  viewer: {
    items: allowAll("items"),
    categories: ["read"],
    assets: ["read"],
    users: []
  }
};

export const getPermissionsForRole = (role: CmsRole = "viewer"): PermissionMap =>
  rolePermissionMap[role];

export const getPermissionMapForActor = ({
  role = "viewer",
  disabled = false
}: {
  role?: CmsRole;
  disabled?: boolean;
}): PermissionMap => (disabled
  ? {
      items: [],
      categories: [],
      assets: [],
      users: []
    }
  : getPermissionsForRole(role));

export const getPermissionMapFromSession = (
  session: Session | null | undefined,
  profile?: { role: CmsRole; disabled: boolean } | null
): PermissionMap =>
  getPermissionMapForActor({
    role: getCmsRoleForUser({
    email: session?.user.email,
    profileRole: profile?.role,
    appMetadata: session?.user.app_metadata,
    fallbackRole: "viewer"
    }),
    disabled: profile?.disabled ?? false
  });

export const canAccess = <TResource extends PermissionResource>(
  permissionMap: Partial<PermissionMap>,
  resource: TResource,
  action: PermissionAction<TResource>
) => permissionMap[resource]?.includes(action) ?? false;
