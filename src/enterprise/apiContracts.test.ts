import { describe, expect, it } from "vitest"
import { validateImportRequest } from "./apiContracts"

const item = {
  organizationId: "org-1",
  externalId: "ext-1",
  sourceSystem: "erp",
  cnjNumber: "0000000-00.2026.8.26.0000",
}

describe("Enterprise import contracts", () => {
  it("accepts structurally valid request", () => {
    expect(validateImportRequest({ idempotencyKey: "batch-1", items: [item] })).toEqual([])
  })
  it("rejects missing idempotency key", () => {
    expect(validateImportRequest({ idempotencyKey: "", items: [item] })).not.toEqual([])
  })
  it("rejects empty batches", () => {
    expect(validateImportRequest({ idempotencyKey: "batch", items: [] })).not.toEqual([])
  })
  it("rejects duplicated external identifiers", () => {
    expect(validateImportRequest({ idempotencyKey: "batch", items: [item, item] })).not.toEqual([])
  })
  it("rejects invalid CNJ format", () => {
    expect(validateImportRequest({ idempotencyKey: "batch", items: [{ ...item, cnjNumber: "123" }] })).not.toEqual([])
  })
})
