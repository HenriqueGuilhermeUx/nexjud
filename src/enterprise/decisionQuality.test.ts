import { describe, expect, it } from "vitest"
import { assessDecisionQuality } from "./decisionQuality"

const valid = {
  id: "evidence-1",
  source: "documento autenticado",
  collectedAt: "2026-10-14T12:00:00Z",
  documentHash: "sha256:" + "a".repeat(64),
  verified: true,
}

describe("Enterprise evidence quality", () => {
  it("blocks summaries without evidence", () => {
    expect(assessDecisionQuality([]).eligibleForAutomatedSummary).toBe(false)
  })
  it("allows summaries with complete verified provenance", () => {
    expect(assessDecisionQuality([valid]).eligibleForAutomatedSummary).toBe(true)
  })
  it("rejects duplicated identifiers", () => {
    expect(assessDecisionQuality([valid, valid]).eligibleForAutomatedSummary).toBe(false)
  })
  it("rejects unverified evidence", () => {
    expect(assessDecisionQuality([{ ...valid, verified: false }]).eligibleForAutomatedSummary).toBe(false)
  })
  it("rejects invalid collection dates", () => {
    expect(assessDecisionQuality([{ ...valid, collectedAt: "invalid" }]).eligibleForAutomatedSummary).toBe(false)
  })
  it("never enables unvalidated financial predictions", () => {
    expect(assessDecisionQuality([valid]).eligibleForFinancialPrediction).toBe(false)
  })
})
