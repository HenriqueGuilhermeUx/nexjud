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
