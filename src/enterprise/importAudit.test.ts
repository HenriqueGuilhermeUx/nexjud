import { describe, expect, it } from "vitest"
import { createImportAuditRecord } from "./importAudit"
import type { ImportPlan } from "./importPlanner"

const plan: ImportPlan = {
  organizationId: "org-a",
  idempotencyKey: "batch-1",
  uniqueCases: [{ externalId: "case-a", cnjDigits: "00000000020268260000", sourceSystem: "erp" }],
}

describe("Enterprise import audit", () => {
  it("records metadata and count without process contents", () => {
    const record = createImportAuditRecord(plan, "user-a", new Date("2026-10-14T12:00:00Z"))
    expect(record.itemCount).toBe(1)
    expect(JSON.stringify(record)).not.toContain("case-a")
    expect(JSON.stringify(record)).not.toContain("00000000020268260000")
  })
  it("requires actor identity", () => {
    expect(() => createImportAuditRecord(plan, "", new Date())).toThrow()
  })
  it("rejects invalid date", () => {
    expect(() => createImportAuditRecord(plan, "user-a", new Date("invalid"))).toThrow()
  })
})
