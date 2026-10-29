import { describe, expect, it } from "vitest"
import { estimateUSCivilDurationBaseline } from "./fjcDescriptiveSurvival"
import { assessUSCivilDurationUncertainty } from "./fjcDescriptiveUncertainty"
import type { TemporalCohortRow } from "./fjcTemporalSplit"

function rows(): TemporalCohortRow[] {
  return Array.from({length: 30}, (_, i) => ({
    caseId: "synthetic-" + i,
    courtCode: "NYSD", natureOfSuit: "190",
    filedAt: "2024-01-01",
    observedDays: i < 10 ? 10 : 20,
    terminationObserved: i < 10 ? 1 as const : 0 as const,
  }))
}

describe("synthetic Greenwood uncertainty for FJC case durations", () => {
  it("calculates an honest descriptive interval without allowing publication", () => {
    const estimate = estimateUSCivilDurationBaseline(rows(), 20)
    expect(estimate).not.toBeNull()
    const report = assessUSCivilDurationUncertainty(estimate!)
    expect(report.method).toBe("greenwood_loglog_95")
    expect(report.survivalEstimate).toBeCloseTo(2/3, 12)
    expect(report.observedEventsAtHorizon).toBe(10)
    expect(report.lower95).not.toBeNull()
    expect(report.upper95).not.toBeNull()
    expect(report.lower95!).toBeLessThan(report.survivalEstimate)
    expect(report.upper95!).toBeGreaterThan(report.survivalEstimate)
    expect(report.independentCensoringVerified).toBe(false)
    expect(report.calibratedPrediction).toBe(false)
    expect(report.publishable).toBe(false)
  })

  it("does not present an artificially exact confidence band when survival reaches zero", () => {
    const x = rows().map((r, i) => ({
      ...r, observedDays: i < 10 ? 10 : i < 20 ? 15 : 20,
      terminationObserved: (i < 10 || i >= 20) ? 1 as const : 0 as const,
    }))
    const estimate = estimateUSCivilDurationBaseline(x, 20)!
    const report = assessUSCivilDurationUncertainty(estimate)
    expect(report.survivalEstimate).toBe(0)
    expect(report.lower95).toBeNull()
    expect(report.upper95).toBeNull()
    expect(report.publishable).toBe(false)
  })

  it("refuses corrupted step-level risk sets and survival histories", () => {
    const x = estimateUSCivilDurationBaseline(rows(), 20)!
    expect(() => assessUSCivilDurationUncertainty({
      ...x, steps: x.steps.map((s,i)=>i===0?{...s,atRisk:29}:s),
    })).toThrow(/risk set/)
    expect(() => assessUSCivilDurationUncertainty({
      ...x, steps: x.steps.map((s,i)=>i===0?{...s,survival:0.99}:s),
    })).toThrow(/survival/)
  })
})
