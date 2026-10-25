import { describe, expect, it } from "vitest"
import { estimateUSCivilDurationBaseline } from "./fjcDescriptiveSurvival"
import type { TemporalCohortRow } from "./fjcTemporalSplit"

function synthetic(): TemporalCohortRow[] {
  return Array.from({ length: 30 }, (_, i) => ({
    caseId: "synthetic-case-" + i,
    courtCode: "nysd",
    natureOfSuit: "190",
    filedAt: "2026-01-01",
    observedDays: i < 10 ? 10 : i < 20 ? 15 : 20,
    terminationObserved: i < 10 || i >= 20 ? 1 as const : 0 as const,
  }))
}

describe("descriptive Kaplan-Meier FJC baseline (synthetic ONLY)", () => {
  it("handles censoring and tied events without counting censored cases as terminations", () => {
    const result = estimateUSCivilDurationBaseline(synthetic(), 20)
    expect(result).not.toBeNull()
    expect(result).toMatchObject({
      method: "kaplan-meier",
      cohortN: 30, totalTerminations: 20, totalRightCensored: 10,
      horizonDays: 20, survivalAtHorizon: 0, medianDays: 20,
      predictiveModelValidated: false, assumptionsVerified: false,
      dataProvenanceAudited: false,
    })
    expect(result!.steps[0]).toMatchObject({
      days: 10, atRisk: 30, terminated: 10, censored: 0,
    })
    expect(result!.steps[1]).toMatchObject({
      days: 15, atRisk: 20, terminated: 0, censored: 10,
    })
    expect(result!.steps[2]).toMatchObject({
      days: 20, atRisk: 10, terminated: 10, censored: 0,
    })
    expect(result!.steps[0].survival).toBeCloseTo(2 / 3, 12)
    expect(result!.restrictedMeanDays).toBeCloseTo(50 / 3, 12)
  })

  it("does not fabricate a median if survival does not reach 50% within horizon", () => {
    const rows = synthetic().map((row, i) => ({
      ...row,
      observedDays: i < 10 ? 5 : i < 20 ? 8 : 20,
      terminationObserved: i < 10 ? 1 as const : 0 as const,
    }))
    const out = estimateUSCivilDurationBaseline(rows, 20)
    expect(out).not.toBeNull()
    expect(out!.medianDays).toBeNull()
    expect(out!.survivalAtHorizon).toBeCloseTo(2 / 3, 12)
    expect(out!.restrictedMeanDays).toBeCloseTo(15, 12)
  })

  it("abstains on insufficient sample, insufficient events and inadequate follow-up", () => {
    expect(estimateUSCivilDurationBaseline(synthetic().slice(0, 20), 10)).toBeNull()
    expect(estimateUSCivilDurationBaseline(synthetic().map((r, i) => ({
      ...r, terminationObserved: i < 9 ? 1 as const : 0 as const,
    })), 20)).toBeNull()
    expect(estimateUSCivilDurationBaseline(synthetic(), 21)).toBeNull()
  })

  it("rejects fabricated event flags, duplicate cases, negative days, and bad horizons", () => {
    expect(() => estimateUSCivilDurationBaseline([...synthetic(), synthetic()[0]], 20)).toThrow()
    expect(() => estimateUSCivilDurationBaseline([
      ...synthetic().slice(1), { ...synthetic()[0], observedDays: -1 },
    ], 20)).toThrow()
    expect(() => estimateUSCivilDurationBaseline([
      ...synthetic().slice(1), { ...synthetic()[0], terminationObserved: 2 as 1 },
    ], 20)).toThrow()
    expect(() => estimateUSCivilDurationBaseline(synthetic(), 0)).toThrow()
    expect(() => estimateUSCivilDurationBaseline(synthetic(), 20, 5)).toThrow()
  })

  it("handles termination at day zero before same-day right-censoring", () => {
    const rows = synthetic().map((r, i) => ({
      ...r, observedDays: i < 10 ? 0 : 20,
      terminationObserved: i < 10 ? 1 as const : 0 as const,
    }))
    const out = estimateUSCivilDurationBaseline(rows, 20)!
    expect(out.steps[0]).toMatchObject({ days: 0, atRisk: 30, terminated: 10 })
    expect(out.survivalAtHorizon).toBeCloseTo(2 / 3, 12)
  })
})
