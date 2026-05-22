import { describe, expect, it } from "vitest";
import { createScopedResourceKey, shouldRetryQuery } from "@imsys/client";

describe("client helpers", () => {
  it("builds scoped resource keys", () => {
    expect(createScopedResourceKey("items", "user-1")).toEqual(["items", "user-1"]);
  });

  it("retries only retriable errors", () => {
    expect(shouldRetryQuery(0, new Error("network timeout"))).toBe(true);
    expect(shouldRetryQuery(0, new Error("validation failed"))).toBe(false);
  });
});
