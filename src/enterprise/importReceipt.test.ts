import { describe, expect, it } from "vitest"
import { createImportReceipt } from "./importReceipt"
import type { ImportPlan } from "./importPlanner"
import type { ImportAuditRecord } from "./importAudit"

const plan: ImportPlan = {
  organizationId: "org-a",
  idempotencyKey: "batch-a",
  uniqueCases: [{ externalId: "case-a", cnjDigits: "00000000020268260000", sourceSystem: "erp" }],
}
const audit: ImportAuditRecord = {
  action: "enterprise.case_import.planned",
  organizationId: "org-a",
  actorId: "user-a",
  idempotencyKey: "batch-a",
  itemCount: 1,
  recordedAt: "2026-10-14T12:00:00Z",
}

describe("Enterprise import receipt", () => {
  it("creates a minimal receipt", () => {
    const receipt = createImportReceipt(plan, audit)
    expect(receipt.itemCount).toBe(1)
    expect(JSON.stringify(receipt)).not.toContain("case-a")
  })
  it("rejects a mismatched organization", () => {
    expect(() => createImportReceipt(plan, { ...audit, organizationId: "org-b" })).toThrow()
  })
  it("rejects a mismatched idempotency key", () => {
    expect(() => createImportReceipt(plan, { ...audit, idempotencyKey: "other" })).toThrow()
  })
  it("rejects mismatched counts", () => {
    expect(() => createImportReceipt(plan, { ...audit, itemCount: 2 })).toThrow()
  })
})
