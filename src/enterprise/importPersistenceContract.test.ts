import { describe, expect, it } from "vitest"
import { assertImportCommitInput } from "./importPersistenceContract"
import type { ImportPlan } from "./importPlanner"
import type { ImportAuditRecord } from "./importAudit"
import type { ImportReceipt } from "./importReceipt"

const plan: ImportPlan = { organizationId: "org-a", idempotencyKey: "batch-a", uniqueCases: [] }
const audit: ImportAuditRecord = { action: "enterprise.case_import.planned", organizationId: "org-a", idempotencyKey: "batch-a", actorId: "user-a", itemCount: 0, recordedAt: "2026-10-14T12:00:00Z" }
const receipt: ImportReceipt = { organizationId: "org-a", idempotencyKey: "batch-a", actorId: "user-a", itemCount: 0, plannedAt: "2026-10-14T12:00:00Z" }
const input = { plan, audit, receipt, requestFingerprint: "sha256:" + "a".repeat(64) }

describe("Enterprise import persistence contract", () => {
  it("accepts consistent metadata", () => {
    expect(() => assertImportCommitInput(input)).not.toThrow()
  })
  it("rejects tenant mismatch", () => {
    expect(() => assertImportCommitInput({ ...input, receipt: { ...receipt, organizationId: "org-b" } })).toThrow()
  })
  it("rejects count mismatch", () => {
    expect(() => assertImportCommitInput({ ...input, audit: { ...audit, itemCount: 1 } })).toThrow()
  })
  it("rejects actor mismatch", () => {
    expect(() => assertImportCommitInput({ ...input, receipt: { ...receipt, actorId: "user-b" } })).toThrow()
  })
  it("rejects missing fingerprint", () => {
    expect(() => assertImportCommitInput({ ...input, requestFingerprint: "" })).toThrow()
  })
})
