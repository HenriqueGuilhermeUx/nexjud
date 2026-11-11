import { describe, expect, it } from "vitest"
import { buildUSFederalCivilResearchMemo } from "./fjcCivilResearchMemo"
import type { TemporalCohortRow } from "./fjcTemporalSplit"

const cohort: TemporalCohortRow[] = Array.from({ length: 60 }, (_, i) => ({
  caseId: "synthetic-case-" + i,
  courtCode: i < 30 ? "NYSD" : "CAND",
  natureOfSuit: i < 30 ? "190" : "440",
  filedAt: "2024-01-01",
  observedDays: i % 30 < 10 ? 10 : i % 30 < 20 ? 15 : 20,
  terminationObserved: (i % 30 < 10 || i % 30 >= 20) ? 1 : 0,
}))
const selection = {
  courtCode: "NYSD",
  natureOfSuit: "190",
  horizonDays: 20,
  sourceDatasetId: "synthetic-fjc",
  sourceRevision: "v1",
  sourceSha256: "a".repeat(64),
  snapshotAsOfDate: "2026-09-30",
  sourceAuditApproved: true,
}

describe("FJC federal single-court research memo — synthetic", () => {
  it("describes a selected court/NOS cohort without implying individualized win rate", () => {
    const memo = buildUSFederalCivilResearchMemo(cohort, selection)
    expect(memo).toMatchObject({
      kind: "descriptive_federal_civil_duration",
      jurisdiction: "US_FEDERAL", courtCode: "NYSD", natureOfSuit: "190",
      cohortSize: 30, observedTerminations: 20, rightCensored: 10,
      status: "DESCRIPTIVE_ONLY",
      estimatedNonterminationAtHorizon: 0,
      individualCaseForecastAvailable: false, modelTrained: false,
    })
    expect(memo.disclaimer).toMatch(/not a legal win/)
  })

  it("abstains for an undersized group instead of borrowing another court's evidence", () => {
    const memo = buildUSFederalCivilResearchMemo(cohort, {
      ...selection, courtCode: "OTHER",
    })
    expect(memo.status).toBe("INSUFFICIENT_EVIDENCE")
    expect(memo.estimatedNonterminationAtHorizon).toBeNull()
    expect(memo.restrictedMeanObservedDays).toBeNull()
  })

  it("requires an explicitly audited version and disallows untraceable source identifiers", () => {
    expect(() => buildUSFederalCivilResearchMemo(cohort, {
      ...selection, sourceAuditApproved: false,
    })).toThrow(/not approved/)
    expect(() => buildUSFederalCivilResearchMemo(cohort, {
      ...selection, sourceSha256: "checksum-pending",
    })).toThrow(/not approved/)
    expect(() => buildUSFederalCivilResearchMemo(cohort, {
      ...selection, natureOfSuit: "190\nCAND",
    })).toThrow(/not approved/)
  })

  it("rejects repeated case identifiers even outside the selected court", () => {
    expect(() => buildUSFederalCivilResearchMemo([
      ...cohort, { ...cohort[0], courtCode: "CAND" },
    ], selection)).toThrow(/repeated/)
  })

  it("refuses case forecasts even when selected historical cases were all concluded", () => {
    const closed = cohort.slice(0, 30).map(r => ({ ...r, terminationObserved: 1 as const }))
    const memo = buildUSFederalCivilResearchMemo(closed, selection)
    expect(memo.individualCaseForecastAvailable).toBe(false)
    expect(memo.modelTrained).toBe(false)
  })
})
