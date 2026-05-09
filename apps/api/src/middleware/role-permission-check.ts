import type { AuthenticatedUser } from "@imsys/auth/middleware";
import {
  canAccess,
  getPermissionMapForActor,
  type PermissionAction,
  type PermissionResource
} from "@imsys/auth";

export class PermissionDeniedError extends Error {}

export const requirePermission = <TResource extends PermissionResource>(
  user: AuthenticatedUser,
  resource: TResource,
  action: PermissionAction<TResource>
) => {
  const permissionMap = getPermissionMapForActor({
    role: user.cmsRole,
    disabled: user.disabled
  });

  if (!canAccess(permissionMap, resource, action)) {
    throw new PermissionDeniedError(
      `Role "${user.cmsRole}" cannot ${action} ${resource}`
    );
  }
};
