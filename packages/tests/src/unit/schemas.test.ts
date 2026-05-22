import { describe, expect, it } from "vitest";
import {
  apiEnvelopeSchema,
  diagnosticsResponseSchema,
  itemCreateInputSchema,
  itemSchema
} from "@imsys/types";

describe("shared schemas", () => {
  it("accepts valid item create inputs and rejects invalid ones", () => {
    expect(itemCreateInputSchema.parse({ name: "First item" })).toEqual({
      name: "First item"
    });
    expect(() => itemCreateInputSchema.parse({ name: "" })).toThrow();
  });

  it("validates api envelopes and diagnostics payloads", () => {
    expect(
      apiEnvelopeSchema(itemSchema.array()).parse({
        data: [
          {
            id: "item-1",
            name: "First item",
            categoryId: null,
            createdAt: "2024-01-01T00:00:00.000Z",
            updatedAt: "2024-01-01T00:00:00.000Z"
          }
        ]
      })
    ).toEqual({
      data: [
        {
          id: "item-1",
          name: "First item",
          categoryId: null,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z"
        }
      ]
    });

    expect(
      diagnosticsResponseSchema.parse({
        checkedAt: "2024-01-01T00:00:00.000Z",
        checks: {
          database: { ok: true },
          schemaVersion: {
            ok: true,
            expected: "2026-05-22-env-scoped-data-v1",
            actual: "2026-05-22-env-scoped-data-v1"
          }
        }
      })
    ).toMatchObject({
      checkedAt: "2024-01-01T00:00:00.000Z"
    });
  });
});
