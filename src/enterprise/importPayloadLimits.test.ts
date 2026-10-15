import { describe, expect, it } from "vitest"
import { validateImportPayloadLimits } from "./importPayloadLimits"

const request = {
  idempotencyKey: "batch-a",
  items: [{ organizationId: "org-a", externalId: "case-a", sourceSystem: "erp", cnjNumber: "0000000-00.2026.8.26.0000" }],
}

describe("Enterprise import payload limits", () => {
  it("accepts case without metadata", () => {
    expect(validateImportPayloadLimits(request)).toEqual([])
  })
  it("rejects oversized idempotency key", () => {
    expect(validateImportPayloadLimits({ ...request, idempotencyKey: "x".repeat(129) }).length).toBeGreaterThan(0)
  })
  it("rejects metadata until covered by fingerprint", () => {
    expect(validateImportPayloadLimits({ ...request, items: [{ ...request.items[0], metadata: { category: "civil" } }] }).length).toBeGreaterThan(0)
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
