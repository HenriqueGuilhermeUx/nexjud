import { describe, expect, it } from "vitest"
import { validateImportPayloadLimits } from "./importPayloadLimits"

const request = {
  idempotencyKey: "batch-a",
  items: [{ organizationId: "org-a", externalId: "case-a", sourceSystem: "erp", cnjNumber: "0000000-00.2026.8.26.0000", metadata: { category: "civil" } }],
}

describe("Enterprise import payload limits", () => {
  it("accepts small metadata", () => {
    expect(validateImportPayloadLimits(request)).toEqual([])
  })
  it("rejects oversized idempotency key", () => {
    expect(validateImportPayloadLimits({ ...request, idempotencyKey: "x".repeat(129) }).length).toBeGreaterThan(0)
  })
  it("rejects too many metadata fields", () => {
    const metadata = Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`key${i}`, "x"]))
    expect(validateImportPayloadLimits({ ...request, items: [{ ...request.items[0], metadata }] }).length).toBeGreaterThan(0)
  })
  it("rejects oversized metadata value", () => {
    expect(validateImportPayloadLimits({ ...request, items: [{ ...request.items[0], metadata: { key: "x".repeat(2049) } }] }).length).toBeGreaterThan(0)
  })
  it("rejects invalid metadata key", () => {
    expect(validateImportPayloadLimits({ ...request, items: [{ ...request.items[0], metadata: { "secret token": "x" } }] }).length).toBeGreaterThan(0)
  })
})
