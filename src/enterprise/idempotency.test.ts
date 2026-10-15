import { describe, expect, it } from "vitest"
import { buildImportIdempotencyScope } from "./idempotency"

describe("enterprise import idempotency scope", () => {
  it("returns stable scope for same tenant and key", () => {
    expect(buildImportIdempotencyScope("org-a", " key-1 ")).toBe(buildImportIdempotencyScope("org-a", "key-1"))
  })
  it("isolates keys across tenants", () => {
    expect(buildImportIdempotencyScope("org-a", "key-1")).not.toBe(buildImportIdempotencyScope("org-b", "key-1"))
  })
  it("avoids delimiter collision", () => {
    expect(buildImportIdempotencyScope("a:b", "c")).not.toBe(buildImportIdempotencyScope("a", "b:c"))
  })
  it("rejects missing keys", () => {
    expect(() => buildImportIdempotencyScope("org-a", "")).toThrow()
  })
})
