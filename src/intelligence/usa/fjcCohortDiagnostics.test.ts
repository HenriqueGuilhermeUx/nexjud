import { describe, expect, it } from "vitest"
import { inspectUSCivilTemporalCohort } from "./fjcCohortDiagnostics"
import type { FJCTemporalSplit, TemporalCohortRow } from "./fjcTemporalSplit"

function makeRow(prefix: string, i: number, filedAt: string, courtCode = "NYSD"): TemporalCohortRow {
  return {
    caseId: prefix + i, courtCode, natureOfSuit: "190", filedAt,
    observedDays: i < 15 ? 30 : 60,
    terminationObserved: i < 15 ? 1 : 0,
  }
}
function fixture(): FJCTemporalSplit {
  return {
    training: Array.from({ length: 30 }, (_, i) => makeRow("training-", i, "2024-01-01")),
    validation: Array.from({ length: 30 }, (_, i) => makeRow("validation-", i, "2025-03-01")),
    excludedGapCases: 0,
    trainingAsOfDate: "2024-12-31",
    validationAsOfDate: "2026-09-30",
    predictiveModelValidated: false,
  }
}
describe("NexJud USA offline temporal cohort diagnostics", () => {
  it("counts comparable groups but never certifies predictive readiness", () => {
    const x = inspectUSCivilTemporalCohort(fixture(), "NYSD", "190")
    expect(x).toMatchObject({
      trainingN: 30, validationN: 30,
      trainingObservedTerminations: 15, validationObservedTerminations: 15,
      trainingRightCensored: 15, validationRightCensored: 15,
      sampleSizeSufficientForDescriptiveReview: true,
      externalValidationCompleted: false,
      modelReady: false, requiresExpertReview: true,
    })
    expect(x.flags).toContain("CENSORING_AND_SOURCE_SELECTION_NOT_AUDITED")
  })

  it("abstains from sample sufficiency when one court disappears in validation", () => {
    const data = fixture()
    data.validation = data.validation.map(r => ({ ...r, courtCode: "OTHER" }))
    const x = inspectUSCivilTemporalCohort(data, "NYSD", "190")
    expect(x.sampleSizeSufficientForDescriptiveReview).toBe(false)
    expect(x.flags).toContain("INSUFFICIENT_SPLIT_SAMPLE")
    expect(x.flags).toContain("EMPTY_TIME_PERIOD")
    expect(x.modelReady).toBe(false)
  })

  it("rejects duplicated cases and training labels extending beyond cutoff", () => {
    const data = fixture()
    data.validation[0] = { ...data.validation[0], caseId: data.training[0].caseId }
    expect(() => inspectUSCivilTemporalCohort(data, "NYSD", "190")).toThrow(/Duplicated/)
    const future = fixture()
    future.training[0] = { ...future.training[0], observedDays: 2000 }
    expect(() => inspectUSCivilTemporalCohort(future, "NYSD", "190")).toThrow(/follow-up exceeds/)
  })

  it("rejects future training filings and inverted cutoffs", () => {
    const data = fixture()
    data.training[0] = { ...data.training[0], filedAt: "2025-03-01" }
    expect(() => inspectUSCivilTemporalCohort(data, "NYSD", "190")).toThrow(/cutoff/)
    const inverted = fixture()
    inverted.validationAsOfDate = "2024-01-01"
    expect(() => inspectUSCivilTemporalCohort(inverted, "NYSD", "190")).toThrow(/temporal windows/)
  })

  it("never merges validation groups to simulate higher legal win probabilities", () => {
    const data = fixture()
    data.validation[0] = { ...data.validation[0], natureOfSuit: "440" }
    const x = inspectUSCivilTemporalCohort(data, "NYSD", "190")
    expect(x.validationN).toBe(29)
    expect(x.sampleSizeSufficientForDescriptiveReview).toBe(false)
    expect(x.flags).toContain("INSUFFICIENT_SPLIT_SAMPLE")
  })
})
