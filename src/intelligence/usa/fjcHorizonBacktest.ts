/**
 * NexJud USA — out-of-period fixed-horizon TERMINATION backtest.
 *
 * This is a fitted, single-rate RESEARCH BENCHMARK, not an AI outcome model.
 * A case's termination by H days is NOT a legal win/loss. The only observed
 * labels come from cases whose follow-up is known through H, or which were
 * explicitly terminated sooner. Unobserved labels cause full abstention,
 * preventing a superficially favorable complete-case-only evaluation.
 *
 * WARNING: Retrospective recensoring is not a real historical data snapshot.
 * No individual prediction, judge effect or legal-use approval is produced.
 */
import type { FJCTemporalSplit, TemporalCohortRow } from "./fjcTemporalSplit"

export interface USFixedHorizonBacktest {
  kind: "federal_civil_termination_horizon_research"
  courtCode: string
  natureOfSuit: string
  horizonDays: number
  trainingN: number
  validationN: number
  trainingTerminatedByHorizon: number
  validationTerminatedByHorizon: number
  trainingKnownOpenAtHorizon: number
  validationKnownOpenAtHorizon: number
  trainingUnobservedAtHorizon: number
  validationUnobservedAtHorizon: number
  /** Null unless EVERY label is observable and minimum samples exist. */
  fittedHistoricalGroupRate: number | null
  outOfTimeBrier: number | null
  status: "RESEARCH_BENCHMARK_ONLY" | "ABSTAIN_INSUFFICIENT_EVIDENCE" | "ABSTAIN_INCOMPLETE_FOLLOWUP"
  /** The baseline is a single group rate, not a trained case-feature AI. */
  caseFeatureModelTrained: false
  prospectiveValidationComplete: false
  dataSourceAuthenticityCertified: false
  individualCaseForecastPermitted: false
}

const day = (value: string): number => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error("Invalid cohort date")
  const v = Date.parse(value + "T00:00:00Z")
  if (!Number.isFinite(v) || new Date(v).toISOString().slice(0, 10) !== value) {
    throw new Error("Invalid cohort date")
  }
  return v
}
type Label = 0 | 1 | null
function label(row: TemporalCohortRow, horizonDays: number): Label {
  if (row.terminationObserved === 1 && row.observedDays <= horizonDays) return 1
  if (row.observedDays >= horizonDays) return 0
  return null // Right-censored before H; no invented outcome.
}
function summarize(rows: TemporalCohortRow[], horizonDays: number) {
  let terminated = 0, knownOpen = 0, unavailable = 0
  for (const r of rows) {
    const y = label(r, horizonDays)
    if (y === 1) terminated++
    else if (y === 0) knownOpen++
    else unavailable++
  }
  return { terminated, knownOpen, unavailable }
}

export function evaluateUSFJCFixedHorizonBacktest(
  split: FJCTemporalSplit,
  courtCode: string,
  natureOfSuit: string,
  horizonDays: number,
): USFixedHorizonBacktest {
  if (!split || !Array.isArray(split.training) || !Array.isArray(split.validation) ||
      !Number.isSafeInteger(horizonDays) || horizonDays < 1 || horizonDays > 36500 ||
      !/^[A-Za-z0-9_.:-]{1,30}$/.test(courtCode) ||
      !/^[A-Za-z0-9_.:-]{1,30}$/.test(natureOfSuit) ||
      split.predictiveModelValidated !== false ||
      split.training.length + split.validation.length > 10000) {
    throw new Error("Invalid US horizon backtest input")
  }
  const trainCutoff = day(split.trainingAsOfDate)
  const validCutoff = day(split.validationAsOfDate)
  if (trainCutoff >= validCutoff) throw new Error("Overlapping or inverted temporal windows")
  const seen = new Set<string>()
  for (const [rows, cutoff, isTrain] of [
    [split.training, trainCutoff, true],
    [split.validation, validCutoff, false],
  ] as const) {
    for (const r of rows) {
      if (!r || typeof r.caseId !== "string" || !r.caseId || seen.has(r.caseId) ||
          typeof r.courtCode !== "string" || typeof r.natureOfSuit !== "string" ||
          !Number.isSafeInteger(r.observedDays) || r.observedDays < 0 ||
          (r.terminationObserved !== 0 && r.terminationObserved !== 1)) {
        throw new Error("Duplicated or malformed FJC horizon record")
      }
      seen.add(r.caseId)
      const filed = day(r.filedAt)
      if ((isTrain && filed > trainCutoff) || (!isTrain && filed <= trainCutoff) ||
          filed > cutoff || r.observedDays > Math.round((cutoff - filed) / 86400000)) {
        throw new Error("FJC horizon label exceeds the observation cutoff")
      }
    }
  }
  const training = split.training.filter(r => r.courtCode === courtCode && r.natureOfSuit === natureOfSuit)
  const validation = split.validation.filter(r => r.courtCode === courtCode && r.natureOfSuit === natureOfSuit)
  const t = summarize(training, horizonDays)
  const v = summarize(validation, horizonDays)
  const complete = t.unavailable === 0 && v.unavailable === 0
  // These conservative sample gates are engineering limits, NOT statistical
  // validation thresholds for future deployment.
  const enough = training.length >= 40 && validation.length >= 40 &&
    t.terminated >= 10 && t.knownOpen >= 10 &&
    v.terminated >= 10 && v.knownOpen >= 10
  const status: USFixedHorizonBacktest["status"] = !complete
    ? "ABSTAIN_INCOMPLETE_FOLLOWUP"
    : !enough ? "ABSTAIN_INSUFFICIENT_EVIDENCE" : "RESEARCH_BENCHMARK_ONLY"
  const rate = status === "RESEARCH_BENCHMARK_ONLY"
    ? t.terminated / training.length : null
  // Single fitted group rate evaluated only in the held-out filing cohort.
  const brier = rate === null ? null :
    (v.terminated * (1 - rate) ** 2 + v.knownOpen * rate ** 2) / validation.length
  return {
    kind: "federal_civil_termination_horizon_research",
    courtCode, natureOfSuit, horizonDays,
    trainingN: training.length, validationN: validation.length,
    trainingTerminatedByHorizon: t.terminated,
    validationTerminatedByHorizon: v.terminated,
    trainingKnownOpenAtHorizon: t.knownOpen,
    validationKnownOpenAtHorizon: v.knownOpen,
    trainingUnobservedAtHorizon: t.unavailable,
    validationUnobservedAtHorizon: v.unavailable,
    fittedHistoricalGroupRate: rate, outOfTimeBrier: brier, status,
    caseFeatureModelTrained: false, prospectiveValidationComplete: false,
    dataSourceAuthenticityCertified: false, individualCaseForecastPermitted: false,
  }
}
