/**
 * Alternative Ventures USA — bounded single-cohort legal research summary.
 *
 * This is a descriptive OFFLINE artifact, not legal case prediction or advice.
 * Never connect to the live NexJud Brazil predictive interface. Requires
 * separate externally audited FJC source snapshot and codebook before use.
 */
import { estimateUSCivilDurationBaseline } from "./fjcDescriptiveSurvival"
import type { TemporalCohortRow } from "./fjcTemporalSplit"

export interface USCivilResearchSelection {
  courtCode: string
  natureOfSuit: string
  horizonDays: number
  sourceDatasetId: string
  sourceRevision: string
  sourceSha256: string
  /** Snapshot must be checked independently against official upstream bytes. */
  snapshotAsOfDate: string
  sourceAuditApproved: boolean
}

export interface USCivilResearchMemo {
  kind: "descriptive_federal_civil_duration"
  jurisdiction: "US_FEDERAL"
  courtCode: string
  natureOfSuit: string
  horizonDays: number
  cohortSize: number
  observedTerminations: number
  rightCensored: number
  estimatedNonterminationAtHorizon: number | null
  restrictedMeanObservedDays: number | null
  medianObservedDays: number | null
  status: "INSUFFICIENT_EVIDENCE" | "DESCRIPTIVE_ONLY"
  disclaimer: string
  modelTrained: false
  individualCaseForecastAvailable: false
}

function simpleId(v: string, max: number): boolean {
  return typeof v === "string" && v.length >= 1 && v.length <= max && /^[A-Za-z0-9_.:-]+$/.test(v)
}

export function buildUSFederalCivilResearchMemo(
  auditedCohort: readonly TemporalCohortRow[],
  selection: USCivilResearchSelection,
): USCivilResearchMemo {
  if (!Array.isArray(auditedCohort) || auditedCohort.length > 10000 || !selection ||
      !simpleId(selection.courtCode, 30) || !simpleId(selection.natureOfSuit, 30) ||
      !simpleId(selection.sourceDatasetId, 120) || !simpleId(selection.sourceRevision, 120) ||
      !/^[0-9a-f]{64}$/i.test(selection.sourceSha256) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(selection.snapshotAsOfDate) ||
      !Number.isInteger(selection.horizonDays) ||
      selection.horizonDays < 1 || selection.horizonDays > 36500 ||
      selection.sourceAuditApproved !== true) {
    throw new Error("US civil research source not approved")
  }
  // Duplicate identifiers anywhere in the cohort may indicate a broken
  // source snapshot or split; do not silently hide them via filtering.
  const seen = new Set<string>()
  for (const row of auditedCohort) {
    if (!row || !simpleId(row.caseId, 160) || seen.has(row.caseId)) {
      throw new Error("Invalid or repeated FJC case identity")
    }
    seen.add(row.caseId)
  }
  const subset = auditedCohort.filter(r =>
    r.courtCode === selection.courtCode && r.natureOfSuit === selection.natureOfSuit
  )
  const evidence = estimateUSCivilDurationBaseline(subset, selection.horizonDays)
  const note = "Historical federal civil-case duration only. Termination is not a legal win, "+
    "future case forecast, judicial ranking or individual probability. Administrative "+
    "censoring and selection bias require independent audit."
  return {
    kind: "descriptive_federal_civil_duration",
    jurisdiction: "US_FEDERAL",
    courtCode: selection.courtCode,
    natureOfSuit: selection.natureOfSuit,
    horizonDays: selection.horizonDays,
    cohortSize: subset.length,
    observedTerminations: subset.filter(r => r.terminationObserved === 1).length,
    rightCensored: subset.filter(r => r.terminationObserved === 0).length,
    estimatedNonterminationAtHorizon: evidence ? evidence.survivalAtHorizon : null,
    restrictedMeanObservedDays: evidence ? evidence.restrictedMeanDays : null,
    medianObservedDays: evidence ? evidence.medianDays : null,
    status: evidence ? "DESCRIPTIVE_ONLY" : "INSUFFICIENT_EVIDENCE",
    disclaimer: note,
    modelTrained: false,
    individualCaseForecastAvailable: false,
  }
}
