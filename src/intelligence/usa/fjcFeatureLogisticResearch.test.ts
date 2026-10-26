import { describe, expect, it } from "vitest"
import { benchmarkUSFJCTerminationFeatureModel } from "./fjcFeatureLogisticResearch"
import type { FJCTemporalSplit, TemporalCohortRow } from "./fjcTemporalSplit"

function fixture(): FJCTemporalSplit {
  const sample = (prefix:string, date:string, perCell:number, high:number, low:number) => {
    const out:TemporalCohortRow[]=[]
    for (const courtCode of ["NYSD","CAND"]) {
      for (const natureOfSuit of ["190","440"]) {
        const terminated = courtCode === "NYSD" ? high : low
        for (let i=0;i<perCell;i++) out.push({
          caseId:prefix+"-"+courtCode+"-"+natureOfSuit+"-"+i,
          courtCode,natureOfSuit,filedAt:date,
          observedDays:i<terminated?30:180,
          terminationObserved:i<terminated?1:0,
        })
      }
    }
    return out
  }
  return {
    training:sample("train","2024-01-01",40,32,8),
    validation:sample("holdout","2025-01-01",30,24,6),
    excludedGapCases:0,
    trainingAsOfDate:"2024-12-31",validationAsOfDate:"2026-09-30",
    predictiveModelValidated:false,
  }
}
describe("fitted FJC court/NOS terminations - synthetic out-of-time research",()=>{
  it("actually fits a categorical logistic model and compares against an unconditional baseline",()=>{
    const a=benchmarkUSFJCTerminationFeatureModel(fixture(),90)
    const b=benchmarkUSFJCTerminationFeatureModel(fixture(),90)
    expect(a).toMatchObject({
      status:"RESEARCH_FEATURE_MODEL",horizonDays:90,
      trainingN:160,holdoutN:120,
      courtCategories:2,natureOfSuitCategories:2,
      trainingUnobservedN:0,holdoutUnobservedN:0,
      fittedFeatureModel:true,outOfTimeEvaluationPerformed:true,
      independentExternalValidationComplete:false,
      genuineHistoricalSnapshotVerified:false,
      realFJCSourceAuthenticated:false,
      calibratedLegalCasePrediction:false,individualForecastEnabled:false,
      outcome:"administrative_termination_by_horizon_not_case_win",
    })
    expect(a.historicalUnconditionalBrier).toBeCloseTo(.25,10)
    expect(a.heldoutFeatureModelBrier).toBeLessThan(.20)
    expect(a.heldoutImprovementBrier).toBeGreaterThan(.05)
    expect(a.historicalUnconditionalLogLoss).toBeCloseTo(Math.log(2), 9)
    expect(a.heldoutFeatureModelLogLoss).toBeLessThan(a.historicalUnconditionalLogLoss!)
    expect(a.holdoutExpectedCalibrationError5).not.toBeNull()
    expect(a.holdoutExpectedCalibrationError5!).toBeGreaterThanOrEqual(0)
    expect(a.holdoutExpectedCalibrationError5!).toBeLessThanOrEqual(1)
    expect(a.calibrationDiagnosticStatus).toBe("DESCRIPTIVE_HOLDOUT_ONLY")
    expect(a).toEqual(b)
    expect(JSON.stringify(a)).not.toContain("train-NYSD")
  })
  it("never treats censored-before-H cases as known open",()=>{
    const f=fixture()
    f.validation[0]={...f.validation[0],terminationObserved:0,observedDays:25}
    const a=benchmarkUSFJCTerminationFeatureModel(f,90)
    expect(a.status).toBe("ABSTAIN_INCOMPLETE_FOLLOWUP")
    expect(a.holdoutUnobservedN).toBe(1)
    expect(a.fittedFeatureModel).toBe(false)
    expect(a.heldoutFeatureModelBrier).toBeNull()
    expect(a.heldoutFeatureModelLogLoss).toBeNull()
    expect(a.holdoutExpectedCalibrationError5).toBeNull()
    expect(a.calibrationDiagnosticStatus).toBe("SUPPRESSED")
  })
  it("abstains when validation includes a category unseen at training time",()=>{
    const f=fixture()
    f.validation[0]={...f.validation[0],courtCode:"UNSEEN"}
    const a=benchmarkUSFJCTerminationFeatureModel(f,90)
    expect(a.status).toBe("ABSTAIN_INSUFFICIENT_OR_UNSEEN_GROUP")
    expect(a.outOfTimeEvaluationPerformed).toBe(false)
  })
  it("refuses thin cohorts and one-class fitting rather than manufacturing accuracy",()=>{
    const f=fixture()
    f.training=f.training.slice(0,30)
    expect(benchmarkUSFJCTerminationFeatureModel(f,90).status)
      .toBe("ABSTAIN_INSUFFICIENT_OR_UNSEEN_GROUP")
    const x=fixture()
    x.training=x.training.map(r=>({...r,terminationObserved:1 as const,observedDays:30}))
    expect(benchmarkUSFJCTerminationFeatureModel(x,90).status)
      .toBe("ABSTAIN_INSUFFICIENT_OR_UNSEEN_GROUP")
  })
  it("suppresses a falsely precise calibration report when predictions occupy only one bin", () => {
    const f=fixture()
    f.training=f.training.map(r=>{
      const index=Number(r.caseId.split("-").at(-1))
      return {...r, terminationObserved: index < 20 ? 1 as const : 0 as const,
        observedDays: index < 20 ? 30 : 180}
    })
    f.validation=f.validation.map(r=>{
      const index=Number(r.caseId.split("-").at(-1))
      return {...r, terminationObserved: index < 15 ? 1 as const : 0 as const,
        observedDays: index < 15 ? 30 : 180}
    })
    const report=benchmarkUSFJCTerminationFeatureModel(f,90)
    expect(report.fittedFeatureModel).toBe(true)
    expect(report.holdoutExpectedCalibrationError5).toBeNull()
    expect(report.calibrationDiagnosticStatus).toBe("SUPPRESSED")
    expect(report.heldoutFeatureModelLogLoss).toBeCloseTo(Math.log(2),2)
    expect(report.individualForecastEnabled).toBe(false)
  })
  it("reports a descriptive temporal gate even for an otherwise strong synthetic model", () => {
    const report = benchmarkUSFJCTerminationFeatureModel(fixture(),90)
    expect(report.temporalDriftStatus).toBe("NO_GATE_BREACH_DESCRIPTIVE_ONLY")
    expect(report.maxTemporalFeatureMixShift).toBe(0)
    expect(report.maxTemporalGroupOutcomeShift).toBeCloseTo(0, 10)
    expect(report.individualForecastEnabled).toBe(false)
    expect(report.calibratedLegalCasePrediction).toBe(false)
  })
  it("abstains on observed court-specific outcome reversal despite adequate total samples", () => {
    const f=fixture()
    f.validation=f.validation.map(r=>{
      const i=Number(r.caseId.split("-").at(-1))
      const events=r.courtCode==="NYSD" ? 6 : 24
      return {...r,terminationObserved:i<events?1 as const:0 as const,
        observedDays:i<events?30:180}
    })
    const report=benchmarkUSFJCTerminationFeatureModel(f,90)
    expect(report.status).toBe("ABSTAIN_TEMPORAL_DRIFT")
    expect(report.temporalDriftStatus).toBe("ABSTAIN_TEMPORAL_DRIFT")
    expect(report.maxTemporalGroupOutcomeShift).toBeGreaterThan(.25)
    expect(report.maxTemporalFeatureMixShift).toBe(0)
    expect(report.fittedFeatureModel).toBe(false)
    expect(report.heldoutFeatureModelBrier).toBeNull()
    expect(report.holdoutExpectedCalibrationError5).toBeNull()
    expect(report.individualForecastEnabled).toBe(false)
  })
  it("abstains on changed cohort category mix even when within-court rates are similar", () => {
    const f=fixture()
    let shifted=0
    f.validation=f.validation.map(r=>{
      if(r.courtCode==="CAND" && shifted++ < 30) {
        return {...r,courtCode:"NYSD"}
      }
      return r
    })
    const report=benchmarkUSFJCTerminationFeatureModel(f,90)
    expect(report.status).toBe("ABSTAIN_TEMPORAL_DRIFT")
    expect(report.temporalDriftStatus).toBe("ABSTAIN_TEMPORAL_DRIFT")
    expect(report.maxTemporalFeatureMixShift).toBeGreaterThan(.2)
    expect(report.fittedFeatureModel).toBe(false)
  })
  it("refuses rare court-by-nature intersections hidden by adequate marginal coverage", () => {
    const f=fixture()
    let shifted=0
    f.validation=f.validation.map(r=>{
      if(r.courtCode==="CAND" && r.natureOfSuit==="190" && shifted++ < 22) {
        return {...r,courtCode:"NYSD"}
      }
      return r
    })
    const report=benchmarkUSFJCTerminationFeatureModel(f,90)
    expect(report.status).toBe("ABSTAIN_SPARSE_INTERSECTION")
    expect(report.temporalDriftStatus).toBe("ABSTAIN_SPARSE_INTERSECTION")
    expect(report.maxTemporalFeatureMixShift).toBeNull()
    expect(report.maxTemporalGroupOutcomeShift).toBeNull()
    expect(report.outOfTimeEvaluationPerformed).toBe(false)
  })
  it("refuses duplicate records, temporal leakage and impossible case dates",()=>{
    const a=fixture()
    a.validation[0]={...a.validation[0],caseId:a.training[0].caseId}
    expect(()=>benchmarkUSFJCTerminationFeatureModel(a,90)).toThrow(/duplicated/)
    const b=fixture()
    b.training[0]={...b.training[0],observedDays:700}
    expect(()=>benchmarkUSFJCTerminationFeatureModel(b,90)).toThrow(/exceeds/)
    const c=fixture()
    c.validation[0]={...c.validation[0],filedAt:"2024-01-01"}
    expect(()=>benchmarkUSFJCTerminationFeatureModel(c,90)).toThrow(/exceeds/)
    const d=fixture()
    d.trainingAsOfDate="2026-12-31"
    expect(()=>benchmarkUSFJCTerminationFeatureModel(d,90)).toThrow(/chronology/)
  })
})
