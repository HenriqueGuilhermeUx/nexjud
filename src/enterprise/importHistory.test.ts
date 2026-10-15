import { describe, expect, it } from "vitest"
import { normalizeImportHistory } from "@/components/EnterpriseImportHistory"

describe("Enterprise author-scoped import history response", () => {
  const row = {
    batchId: "11111111-1111-4111-8111-111111111111",
    idempotencyKey: "first-lot",
    itemCount: 2,
    linkedCaseCount: 1,
    createdAt: "2026-10-15T12:00:00Z",
  }
  it("normalizes safe batch summary without exposing internal receipt", () => {
    expect(normalizeImportHistory([row])).toEqual([row])
  })
  it("accepts deleted-case history while preserving original count", () => {
    expect(normalizeImportHistory([{ ...row, linkedCaseCount: 0 }])).toHaveLength(1)
  })
  it.each([
    null, {}, { batches: [] }, [null], [{ ...row, itemCount: -1 }],
    [{ ...row, linkedCaseCount: 3 }], [{ ...row, itemCount: "2" }],
    [{ ...row, createdAt: null }], Array.from({ length: 51 }, () => row),
  ])("fails closed on malformed history %#", sample => {
    expect(normalizeImportHistory(sample)).toBeNull()
  })
})
