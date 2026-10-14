import { describe, expect, it } from "vitest"
import { assertImportCommitResult } from "./importCommitResponse"
import type { ImportReceipt } from "./importReceipt"

const receipt: ImportReceipt = { organizationId: "org-a", idempotencyKey: "batch-a", itemCount: 1, actorId: "user-a", plannedAt: "2026-10-14T12:00:00Z" }

describe("Enterprise import commit response", () => {
  it("accepts matching created receipt", () => {
    expect(() => assertImportCommitResult(receipt, { status: "created", receipt })).not.toThrow()
  })
  it("rejects cross-tenant result", () => {
    expect(() => assertImportCommitResult(receipt, { status: "created", receipt: { ...receipt, organizationId: "org-b" } })).toThrow()
  })
  it("rejects another idempotency key", () => {
    expect(() => assertImportCommitResult(receipt, { status: "already_processed", receipt: { ...receipt, idempotencyKey: "other" } })).toThrow()
  })
  it("permits exact replay to return original actor and timestamp", () => {
    expect(() => assertImportCommitResult(receipt, { status: "already_processed", receipt: { ...receipt, actorId: "original-user", plannedAt: "2026-10-13T12:00:00Z" } })).not.toThrow()
  })
  it("rejects mismatched created actor", () => {
    expect(() => assertImportCommitResult(receipt, { status: "created", receipt: { ...receipt, actorId: "other" } })).toThrow()
  })
})
