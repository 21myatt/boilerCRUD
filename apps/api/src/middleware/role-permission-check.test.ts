import test from "node:test";
import assert from "node:assert/strict";
import { PermissionDeniedError, requirePermission } from "./role-permission-check";

test("allows actions permitted for the CMS role", () => {
  assert.doesNotThrow(() =>
    requirePermission(
      { id: "user-1", cmsRole: "editor", disabled: false },
      "items",
      "update"
    )
  );
});

test("rejects actions outside the CMS role permission map", () => {
  assert.throws(
    () =>
      requirePermission(
        { id: "user-1", cmsRole: "reviewer", disabled: false },
        "items",
        "delete"
      ),
    PermissionDeniedError
  );
});

test("rejects disabled users even when the role allows the action", () => {
  assert.throws(
    () =>
      requirePermission(
        { id: "user-1", cmsRole: "admin", disabled: true },
        "users",
        "read"
      ),
    PermissionDeniedError
  );
});
