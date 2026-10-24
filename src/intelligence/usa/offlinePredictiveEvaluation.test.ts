import { describe, expect, it } from "vitest"
import {
  evaluateAuditedHoldout,
  type AuditedForecastRow,
} from "./offlinePredictiveEvaluation"

function sample(n: number): AuditedForecastRow[] {
  return Array.from({ length: n }, (_, i) => {
    const observedOutcome = (i % 2) as 0 | 1
    return {
      caseId: "public-holdout-case-" + i,
      forecastAt: "2024-01-01T00:00:00Z",
      outcomeVerifiedAt: "2025-06-01T00:00:00Z",
      verifiedSourceUrl: "https://www.courtlistener.com/opinion/100/",
      observedOutcome,
      predictedProbability: observedOutcome ? 0.8 : 0.2,
    }
  })
}

describe("USA predictive evaluation - audit-only, never model validation by itself", () => {
  it("abstains on insufficient support", () => {
    expect(evaluateAuditedHoldout(sample(49), 0.5)).toBeNull()
  })

  it("computes Brier, baseline and reliability only for supplied audited holdout labels", () => {
    const report = evaluateAuditedHoldout(sample(50), 0.5)
    expect(report).not.toBeNull()
    expect(report?.n).toBe(50)
    expect(report?.brierScore).toBeCloseTo(0.04, 8)
    expect(report?.baselineBrierScore).toBeCloseTo(0.25, 8)
    expect(report?.outcomeRate).toBe(0.5)
    expect(report?.reliability.reduce((a, x) => a + x.count, 0)).toBe(50)
    expect(report?.reliability[2]).toMatchObject({ count: 25, observedRate: 0 })
    expect(report?.reliability[8]).toMatchObject({ count: 25, observedRate: 1 })
  })

  it("rejects duplicated cases, scores after decision and unaudited provenance", () => {
    const base = sample(50)
    expect(() => evaluateAuditedHoldout([...base, base[0]], 0.5)).toThrow()
    expect(() => evaluateAuditedHoldout(
      base.map((r, i) => i === 0 ? { ...r, forecastAt: "2026-01-01T00:00:00Z" } : r), 0.5,
    )).toThrow()
    expect(() => evaluateAuditedHoldout(
      base.map((r, i) => i === 0 ? { ...r, verifiedSourceUrl: "javascript:fake" } : r), 0.5,
    )).toThrow()
  })

  it("rejects impossible probabilities, synthetic outcomes and invalid training baseline", () => {
    const base = sample(50)
    expect(() => evaluateAuditedHoldout(base, 1.2)).toThrow()
    expect(() => evaluateAuditedHoldout(
      base.map((r, i) => i === 0 ? { ...r, predictedProbability: 1.1 } : r), 0.5,
    )).toThrow()
    expect(() => evaluateAuditedHoldout(
      base.map((r, i) => i === 0 ? { ...r, observedOutcome: null as unknown as 0 } : r), 0.5,
    )).toThrow()
  })
})
