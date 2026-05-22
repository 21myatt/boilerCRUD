import { describe, expect, it } from "vitest";
import { buildAssetObjectPath } from "@imsys/client";
import { toISODate } from "@imsys/utils";

describe("utils", () => {
  it("formats dates as ISO strings", () => {
    expect(toISODate(new Date("2024-01-02T03:04:05.678Z"))).toBe("2024-01-02T03:04:05.678Z");
  });

  it("builds stable asset object paths", () => {
    const path = buildAssetObjectPath("production", "user-1", "My File.pdf", new Date("2024-01-02T03:04:05.678Z"));
    expect(path).toBe("production/user-1/2024-01-02T03:04:05.678Z-my-file.pdf");
  });
});
