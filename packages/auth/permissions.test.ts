import test from "node:test";
import assert from "node:assert/strict";
import {
  canAccess,
  getPermissionMapForActor,
  getPermissionMapFromSession,
  getPermissionsForRole
} from "./permissions.ts";
import {
  ADMIN_EMAIL,
  VIEWER_EMAIL,
  getBootstrapCmsRole,
  getCmsRoleForUser,
  getCmsRoleFromAppMetadata,
  isProtectedBootstrapEmail,
  normalizeCmsRole
} from "./roles.ts";

test("normalizes current and legacy CMS roles", () => {
  assert.equal(normalizeCmsRole("admin"), "admin");
  assert.equal(normalizeCmsRole("manager"), "editor");
  assert.equal(normalizeCmsRole("user"), "viewer");
  assert.equal(normalizeCmsRole("unknown"), null);
});

test("extracts CMS role from app metadata", () => {
  assert.equal(getCmsRoleFromAppMetadata({ cmsRole: "editor" }), "editor");
  assert.equal(getCmsRoleFromAppMetadata({ cms_role: "reviewer" }), "reviewer");
  assert.equal(getCmsRoleFromAppMetadata({ roles: ["viewer"] }), "viewer");
  assert.equal(getCmsRoleFromAppMetadata({}), "viewer");
});

test("resolves fixed local users by email before app metadata", () => {
  assert.equal(getCmsRoleForUser({
    email: ADMIN_EMAIL,
    profileRole: "viewer",
    appMetadata: { cmsRole: "viewer" },
    bootstrapOverrideMode: "enabled"
  }), "admin");
  assert.equal(getCmsRoleForUser({
    email: VIEWER_EMAIL,
    profileRole: "admin",
    appMetadata: { cmsRole: "admin" },
    bootstrapOverrideMode: "enabled"
  }), "viewer");
});

test("disables bootstrap email overrides outside development-style environments", () => {
  assert.equal(getBootstrapCmsRole(ADMIN_EMAIL, "disabled"), null);
  assert.equal(isProtectedBootstrapEmail(VIEWER_EMAIL, "disabled"), false);
  assert.equal(getCmsRoleForUser({
    email: ADMIN_EMAIL,
    profileRole: "viewer",
    appMetadata: { cmsRole: "admin" },
    bootstrapOverrideMode: "disabled"
  }), "viewer");
});

test("prefers profile role for non-bootstrap users", () => {
  assert.equal(getCmsRoleForUser({
    email: "editor@example.com",
    profileRole: "editor",
    appMetadata: { cmsRole: "viewer" }
  }), "editor");
});

test("does not trust app metadata roles for non-bootstrap users without profiles", () => {
  assert.equal(getCmsRoleForUser({
    email: "adminish@example.com",
    appMetadata: { cmsRole: "admin" }
  }), "viewer");
});

test("builds permission maps from session identity", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = "development";
  try {
    const adminPermissions = getPermissionMapFromSession({
      user: {
        email: ADMIN_EMAIL,
        app_metadata: {
          cmsRole: "viewer"
        }
      }
    } as never, {
      role: "viewer",
      disabled: false
    });

    assert.equal(canAccess(adminPermissions, "items", "delete"), true);
    assert.equal(canAccess(adminPermissions, "categories", "create"), true);
    assert.equal(canAccess(adminPermissions, "assets", "create"), true);
    assert.equal(canAccess(adminPermissions, "users", "update"), true);

    const viewerPermissions = getPermissionMapFromSession({
      user: {
        email: VIEWER_EMAIL,
        app_metadata: {}
      }
    } as never, {
      role: "admin",
      disabled: false
    });

    assert.equal(canAccess(viewerPermissions, "items", "delete"), true);
    assert.equal(canAccess(viewerPermissions, "categories", "create"), false);
    assert.equal(canAccess(viewerPermissions, "assets", "create"), false);
    assert.equal(canAccess(viewerPermissions, "users", "read"), false);

    const disabledPermissions = getPermissionMapForActor({
      role: "admin",
      disabled: true
    });

    assert.equal(canAccess(disabledPermissions, "items", "read"), false);

    const fallbackPermissions = getPermissionsForRole("viewer");
    assert.equal(canAccess(fallbackPermissions, "items", "update"), true);
    assert.equal(canAccess(fallbackPermissions, "categories", "update"), false);
    assert.equal(canAccess(fallbackPermissions, "assets", "read"), true);
  } finally {
    process.env.NODE_ENV = originalNodeEnv;
  }
});
