import { describe, expect, it } from "vitest"
import { canonicalImportPayload, validateImportFingerprint } from "./importFingerprint"
import type { ImportPlan } from "./importPlanner"

const plan: ImportPlan = {
  organizationId: "org-a",
  idempotencyKey: "batch-a",
  uniqueCases: [{ externalId: "case-a", cnjDigits: "00000000020268260000", sourceSystem: "erp" }],
}

describe("Enterprise import fingerprint", () => {
  it("creates a stable canonical payload", () => {
    expect(canonicalImportPayload(plan)).toBe(canonicalImportPayload({ ...plan }))
  })
  it("changes when case contents change", () => {
    expect(canonicalImportPayload(plan)).not.toBe(canonicalImportPayload({ ...plan, uniqueCases: [{ ...plan.uniqueCases[0], externalId: "case-b" }] }))
  })
  it("excludes idempotency key from content fingerprint", () => {
    expect(canonicalImportPayload(plan)).toBe(canonicalImportPayload({ ...plan, idempotencyKey: "batch-b" }))
  })
  it("validates SHA-256 digest format", () => {
    expect(() => validateImportFingerprint("sha256:" + "a".repeat(64))).not.toThrow()
    expect(() => validateImportFingerprint("sha256:abc")).toThrow()
  })
})
