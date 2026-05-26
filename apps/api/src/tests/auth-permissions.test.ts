import test from "node:test";
import assert from "node:assert/strict";
import {
  canAccess,
  getBootstrapCmsRole,
  getCmsRoleForUser,
  getPermissionMapForActor,
  getPermissionMapFromSession,
  getPermissionsForRole,
  getCmsRoleFromAppMetadata,
  isProtectedBootstrapEmail,
  normalizeCmsRole
} from "@imsys/auth";

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

test("does not apply bootstrap email overrides", () => {
  assert.equal(getBootstrapCmsRole("admin@local.dev", "enabled"), null);
  assert.equal(isProtectedBootstrapEmail("viewer@local.dev", "enabled"), false);
  assert.equal(getCmsRoleForUser({
    email: "admin@local.dev",
    profileRole: "viewer",
    appMetadata: { cmsRole: "admin" },
    bootstrapOverrideMode: "enabled"
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
  const adminPermissions = getPermissionMapFromSession({
    user: {
      email: "admin@example.com",
      app_metadata: {
        cmsRole: "viewer"
      }
    }
  } as never, {
    role: "admin",
    disabled: false
  });

  assert.equal(canAccess(adminPermissions, "items", "delete"), true);
  assert.equal(canAccess(adminPermissions, "categories", "create"), true);
  assert.equal(canAccess(adminPermissions, "assets", "create"), true);
  assert.equal(canAccess(adminPermissions, "users", "update"), true);

  const viewerPermissions = getPermissionMapFromSession({
    user: {
      email: "viewer@example.com",
      app_metadata: {}
    }
  } as never, {
    role: "viewer",
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
});
