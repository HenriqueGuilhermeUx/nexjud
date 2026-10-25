/**
 * NexJud USA — Kaplan–Meier DESCRIPTIVE duration baseline (offline).
 *
 * Estimates observed case-nontermination survival from right-censored FJC
 * cohorts. It is NOT a calibrated individual prediction, win/loss probability,
 * physician/legal advice or an outcome model. Assumes independent censoring;
 * no real US cohort has been checked for that assumption.
 *
 * Pass only one audited, fixed cohort with known inclusion/exclusion, then
 * independently validate temporal stability and data provenance.
 */
import type { TemporalCohortRow } from "./fjcTemporalSplit"

export interface USDurationStep {
  days: number
  atRisk: number
  terminated: number
  censored: number
  /** Observed nontermination survival after all events at this day. */
  survival: number
}

export interface USDescriptiveDurationEstimate {
  method: "kaplan-meier"
  cohortN: number
  totalTerminations: number
  totalRightCensored: number
  horizonDays: number
  survivalAtHorizon: number
  restrictedMeanDays: number
  medianDays: number | null
  steps: USDurationStep[]
  predictiveModelValidated: false
  dataProvenanceAudited: false
  assumptionsVerified: false
}

export function estimateUSCivilDurationBaseline(
  rows: readonly TemporalCohortRow[],
  horizonDays: number,
  minSample = 30,
  minTerminations = 10,
): USDescriptiveDurationEstimate | null {
  if (!Array.isArray(rows) || rows.length > 10000 || !Number.isInteger(horizonDays) ||
      horizonDays < 1 || horizonDays > 36500 || !Number.isInteger(minSample) ||
      minSample < 30 || !Number.isInteger(minTerminations) || minTerminations < 10) {
    throw new Error("Invalid US duration baseline configuration")
  }
  const ids = new Set<string>()
  const atTimes = new Map<number, { events: number; censored: number }>()
  let terminations = 0
  let maxFollowup = -1
  for (const r of rows) {
    if (!r || typeof r.caseId !== "string" || !r.caseId.trim() || ids.has(r.caseId) ||
        typeof r.courtCode !== "string" || !r.courtCode.trim() ||
        typeof r.natureOfSuit !== "string" || !r.natureOfSuit.trim() ||
        typeof r.filedAt !== "string" ||
        !Number.isSafeInteger(r.observedDays) || r.observedDays < 0 ||
        r.observedDays > 36500 ||
        (r.terminationObserved !== 0 && r.terminationObserved !== 1)) {
      throw new Error("Invalid or duplicate audited duration record")
    }
    ids.add(r.caseId)
    const group = atTimes.get(r.observedDays) ?? { events: 0, censored: 0 }
    if (r.terminationObserved === 1) { group.events++; terminations++ }
    else group.censored++
    atTimes.set(r.observedDays, group)
    maxFollowup = Math.max(maxFollowup, r.observedDays)
  }
  // Cannot estimate horizon from a shorter follow-up window. Never extend
  // the last event's KM step indefinitely as a supported horizon estimate.
  if (rows.length < minSample || terminations < minTerminations ||
      maxFollowup < horizonDays) return null

  let atRisk = rows.length
  let survival = 1
  let medianDays: number | null = null
  let lastDay = 0
  let area = 0
  const steps: USDurationStep[] = []
  const ordered = [...atTimes].sort((a, b) => a[0] - b[0])
  for (const [days, count] of ordered) {
    if (days > horizonDays) break
    area += survival * (days - lastDay)
    if (count.events + count.censored > atRisk) {
      throw new Error("Inconsistent duration risk set")
    }
    // Events before censoring on tied days.
    if (count.events > 0) survival *= (atRisk - count.events) / atRisk
    if (medianDays === null && survival <= 0.5) medianDays = days
    steps.push({
      days, atRisk, terminated: count.events, censored: count.censored, survival,
    })
    atRisk -= count.events + count.censored
    lastDay = days
  }
  area += survival * (horizonDays - lastDay)
  return {
    method: "kaplan-meier",
    cohortN: rows.length,
    totalTerminations: terminations,
    totalRightCensored: rows.length - terminations,
    horizonDays,
    survivalAtHorizon: survival,
    restrictedMeanDays: area,
    medianDays,
    steps,
    predictiveModelValidated: false,
    dataProvenanceAudited: false,
    assumptionsVerified: false,
  }
}
