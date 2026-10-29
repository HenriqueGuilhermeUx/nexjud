import { describe, expect, it } from "vitest"
import { evaluateUSFJCFixedHorizonBacktest } from "./fjcHorizonBacktest"
import type { FJCTemporalSplit, TemporalCohortRow } from "./fjcTemporalSplit"

function make(id: string, filedAt: string, observedDays: number, terminated: 0|1, courtCode="NYSD"): TemporalCohortRow {
  return {
    caseId: id, filedAt, observedDays, terminationObserved: terminated,
    courtCode, natureOfSuit: "190",
  }
}
function synthetic(): FJCTemporalSplit {
  return {
    training: Array.from({length:60}, (_,i)=>make("train-"+i, "2024-01-01", i<20?30:300,i<20?1:0)),
    validation: Array.from({length:60}, (_,i)=>make("holdout-"+i,"2025-01-01",i<30?30:300,i<30?1:0)),
    excludedGapCases:0,
    trainingAsOfDate:"2024-12-31",
    validationAsOfDate:"2026-09-30",
    predictiveModelValidated:false,
  }
}
describe("NexJud USA: actual historical group-rate backtest, NO individual prediction", () => {
  it("fits on past cases, scores held-out period and explicitly disclaims predictive validation", () => {
    const r = evaluateUSFJCFixedHorizonBacktest(synthetic(),"NYSD","190",90)
    expect(r).toMatchObject({
      status:"RESEARCH_BENCHMARK_ONLY",
      horizonDays:90,
      trainingN:60,validationN:60,
      trainingTerminatedByHorizon:20,trainingKnownOpenAtHorizon:40,
      validationTerminatedByHorizon:30,validationKnownOpenAtHorizon:30,
      trainingUnobservedAtHorizon:0,validationUnobservedAtHorizon:0,
      caseFeatureModelTrained:false,
      prospectiveValidationComplete:false,
      dataSourceAuthenticityCertified:false,
      individualCaseForecastPermitted:false,
    })
    expect(r.fittedHistoricalGroupRate).toBeCloseTo(1/3,10)
    expect(r.outOfTimeBrier).toBeCloseTo(5/18,10)
  })

  it("refuses to pretend recently filed right-censored cases survived through H", () => {
    const split=synthetic()
    split.validation[50]={...split.validation[50],observedDays:45}
    const r=evaluateUSFJCFixedHorizonBacktest(split,"NYSD","190",90)
    expect(r.status).toBe("ABSTAIN_INCOMPLETE_FOLLOWUP")
    expect(r.validationUnobservedAtHorizon).toBe(1)
    expect(r.fittedHistoricalGroupRate).toBeNull()
    expect(r.outOfTimeBrier).toBeNull()
  })

  it("a case terminated AFTER horizon is known open at horizon, not labeled a success", () => {
    const split=synthetic()
    split.validation[40]={...split.validation[40],terminationObserved:1,observedDays:120}
    const r=evaluateUSFJCFixedHorizonBacktest(split,"NYSD","190",90)
    expect(r.validationKnownOpenAtHorizon).toBe(30)
    expect(r.validationTerminatedByHorizon).toBe(30)
    expect(r.status).toBe("RESEARCH_BENCHMARK_ONLY")
    expect(r.individualCaseForecastPermitted).toBe(false)
  })

  it("does not pool other courts and refuses thin or single-class samples", () => {
    const split=synthetic()
    split.validation=split.validation.map((r,i)=>i>=35?{...r,courtCode:"CAND"}:r)
    const r=evaluateUSFJCFixedHorizonBacktest(split,"NYSD","190",90)
    expect(r.status).toBe("ABSTAIN_INSUFFICIENT_EVIDENCE")
    expect(r.validationN).toBe(35)
    expect(r.outOfTimeBrier).toBeNull()
  })

  it("rejects duplicate IDs, future labels, invalid cutoffs and malformed labels", () => {
    const copy=synthetic()
    copy.validation[0]={...copy.validation[0],caseId:copy.training[0].caseId}
    expect(()=>evaluateUSFJCFixedHorizonBacktest(copy,"NYSD","190",90)).toThrow(/Duplicated/)
    const future=synthetic()
    future.training[0]={...future.training[0],observedDays:3000}
    expect(()=>evaluateUSFJCFixedHorizonBacktest(future,"NYSD","190",90)).toThrow(/exceeds/)
    const bad=synthetic()
    bad.trainingAsOfDate="2026-12-31"
    expect(()=>evaluateUSFJCFixedHorizonBacktest(bad,"NYSD","190",90)).toThrow(/Overlapping/)
    expect(()=>evaluateUSFJCFixedHorizonBacktest(synthetic(),"NYSD","190",0)).toThrow()
  })
})
