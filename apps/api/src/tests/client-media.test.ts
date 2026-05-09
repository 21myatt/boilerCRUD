import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAssetObjectPath,
  inferAssetKind
} from "../../../../packages/client/media";
import {
  isRetriableQueryError,
  shouldRetryQuery
} from "../../../../packages/client/query";

test("builds deterministic storage object paths", () => {
  const path = buildAssetObjectPath(
    "user-123",
    "Hero Banner.PNG",
    new Date("2026-05-06T10:11:12.000Z")
  );

  assert.equal(path, "user-123/2026-05-06T10:11:12.000Z-hero-banner.png");
});

test("infers asset kind from mime type", () => {
  assert.equal(inferAssetKind("image/png"), "image");
  assert.equal(inferAssetKind("application/pdf"), "document");
  assert.equal(inferAssetKind("application/octet-stream"), "file");
});

test("retries only retriable query errors", () => {
  assert.equal(isRetriableQueryError(new Error("Network request failed")), true);
  assert.equal(isRetriableQueryError(new Error("Validation failed")), false);
  assert.equal(shouldRetryQuery(0, new Error("503 temporarily unavailable")), true);
  assert.equal(shouldRetryQuery(2, new Error("503 temporarily unavailable")), false);
});
