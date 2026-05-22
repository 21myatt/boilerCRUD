import test from "node:test";
import assert from "node:assert/strict";
import { APP_SCHEMA_VERSION } from "@imsys/utils";
import { buildDiagnosticsPayload } from "../services/diagnostics";

test("marks schema version mismatch as unhealthy", () => {
  const payload = buildDiagnosticsPayload({
    checkedAt: "2026-05-08T12:00:00.000Z",
    databaseOk: true,
    authAdminOk: true,
    storageBucketOk: true,
    profilesTableOk: true,
    currentVersion: "wrong-version"
  });

  assert.equal(payload.checks.database.ok, true);
  assert.equal(payload.checks.schemaVersion.ok, false);
    assert.equal(payload.checks.schemaVersion.expected, APP_SCHEMA_VERSION);
  assert.equal(payload.checks.schemaVersion.actual, "wrong-version");
});
