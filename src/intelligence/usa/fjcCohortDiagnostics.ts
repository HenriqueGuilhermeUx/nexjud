/**
 * NexJud USA — synthetic/offline historical-cohort quality diagnostics.
 *
 * Training/validation are assembled by filing date, and pending cases were
 * right-censored at different cutoffs. This CANNOT establish prospective
 * prediction reliability. Different censoring rates are NOT independently
 * comparable outcomes and must not be presented as court performance.
 */
import type { FJCTemporalSplit, TemporalCohortRow } from "./fjcTemporalSplit"

export interface USFederalCivilCohortDiagnostics {
  method: "temporal_cohort_preflight"
  courtCode: string
  natureOfSuit: string
  trainingN: number
  validationN: number
  trainingObservedTerminations: number
  validationObservedTerminations: number
  trainingRightCensored: number
  validationRightCensored: number
  trainingMaxFollowupDays: number
  validationMaxFollowupDays: number
  sampleSizeSufficientForDescriptiveReview: boolean
  flags: string[]
  /** No data-source audit, survival assumptions or predictive backtest. */
  externalValidationCompleted: false
  modelReady: false
  requiresExpertReview: true
}

function utcDay(s: string): number {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    throw new Error("Invalid FJC split date")
  }
  const d = Date.parse(s + "T00:00:00Z")
  if (!Number.isFinite(d) || new Date(d).toISOString().slice(0, 10) !== s) {
    throw new Error("Invalid FJC split date")
  }
  return d
}

function checkedRows(rows: readonly TemporalCohortRow[], deadline: number, seen: Set<string>): void {
  for (const r of rows) {
    if (!r || !r.caseId || seen.has(r.caseId) ||
        typeof r.courtCode !== "string" || !r.courtCode ||
        typeof r.natureOfSuit !== "string" || !r.natureOfSuit ||
        !Number.isSafeInteger(r.observedDays) || r.observedDays < 0 ||
        (r.terminationObserved !== 0 && r.terminationObserved !== 1)) {
      throw new Error("Duplicated or invalid FJC cohort record")
    }
    seen.add(r.caseId)
    const filed = utcDay(r.filedAt)
    if (filed > deadline || r.observedDays > Math.round((deadline - filed) / 86400000)) {
      throw new Error("FJC follow-up exceeds source time cutoff")
    }
  }
}

export function inspectUSCivilTemporalCohort(
  split: FJCTemporalSplit,
  courtCode: string,
  natureOfSuit: string,
): USFederalCivilCohortDiagnostics {
  if (!split || !Array.isArray(split.training) || !Array.isArray(split.validation) ||
      split.training.length + split.validation.length > 10000 ||
      !courtCode || !natureOfSuit || courtCode.length > 30 || natureOfSuit.length > 30 ||
      !/^[A-Za-z0-9_.:-]+$/.test(courtCode) ||
      !/^[A-Za-z0-9_.:-]+$/.test(natureOfSuit)) {
    throw new Error("Invalid FJC temporal cohort input")
  }
  const trainUntil = utcDay(split.trainingAsOfDate)
  const valUntil = utcDay(split.validationAsOfDate)
  if (trainUntil >= valUntil || split.predictiveModelValidated !== false) {
    throw new Error("Inconsistent FJC temporal windows")
  }
  const seen = new Set<string>()
  checkedRows(split.training, trainUntil, seen)
  checkedRows(split.validation, valUntil, seen)
  if (split.training.some(r => utcDay(r.filedAt) > trainUntil) ||
      split.validation.some(r => utcDay(r.filedAt) <= trainUntil)) {
    throw new Error("Overlapping FJC filing date windows")
  }
  const train = split.training.filter(x => x.courtCode === courtCode && x.natureOfSuit === natureOfSuit)
  const valid = split.validation.filter(x => x.courtCode === courtCode && x.natureOfSuit === natureOfSuit)
  const events = (xs: readonly TemporalCohortRow[]) => xs.filter(x => x.terminationObserved === 1).length
  const followup = (xs: readonly TemporalCohortRow[]) => xs.length ? Math.max(...xs.map(x => x.observedDays)) : 0
  const flags: string[] = []
  if (train.length < 30 || valid.length < 30) flags.push("INSUFFICIENT_SPLIT_SAMPLE")
  if (events(train) < 10 || events(valid) < 10) flags.push("FEW_OBSERVED_TERMINATIONS")
  if (train.length === 0 || valid.length === 0) flags.push("EMPTY_TIME_PERIOD")
  // Important: no simplistic drift test on censoring rates. Different
  // observation windows can explain the difference without case-type drift.
  flags.push("CENSORING_AND_SOURCE_SELECTION_NOT_AUDITED")
  return {
    method: "temporal_cohort_preflight",
    courtCode, natureOfSuit,
    trainingN: train.length, validationN: valid.length,
    trainingObservedTerminations: events(train),
    validationObservedTerminations: events(valid),
    trainingRightCensored: train.length - events(train),
    validationRightCensored: valid.length - events(valid),
    trainingMaxFollowupDays: followup(train),
    validationMaxFollowupDays: followup(valid),
    sampleSizeSufficientForDescriptiveReview: train.length >= 30 && valid.length >= 30 &&
      events(train) >= 10 && events(valid) >= 10,
    flags,
    externalValidationCompleted: false, modelReady: false,
    requiresExpertReview: true,
  }
}
