/**
 * NexJud USA — temporal split for civil time-to-termination research.
 * Prevents label leakage from termination dates AFTER the training cutoff.
 * This is cohort partitioning only; no model training or survival estimation.
 */
import type { FJCNormalizedCivilCase } from "./fjcCivilCohort"

function day(s: string): number {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new Error("Invalid cohort date")
  const t = Date.parse(s + "T00:00:00Z")
  if (!Number.isFinite(t) || new Date(t).toISOString().slice(0, 10) !== s) {
    throw new Error("Invalid cohort date")
  }
  return t
}

export interface TemporalCohortRow {
  caseId: string
  courtCode: string
  natureOfSuit: string
  filedAt: string
  /** Follow-up days limited to the cohort-specific observation window. */
  observedDays: number
  /** True only when termination was known by the cohort's cutoff. */
  terminationObserved: 0 | 1
}

export interface FJCTemporalSplit {
  training: TemporalCohortRow[]
  validation: TemporalCohortRow[]
  excludedGapCases: number
  trainingAsOfDate: string
  validationAsOfDate: string
  /** No trained model and no claimed predictive validity. */
  predictiveModelValidated: false
}

export function splitFJCCivilCohortByFiling(
  records: readonly FJCNormalizedCivilCase[],
  trainThrough: string,
  validateFrom: string,
): FJCTemporalSplit {
  if (!Array.isArray(records) || records.length === 0 || records.length > 10000) {
    throw new Error("Invalid FJC cohort size")
  }
  const trainEnd = day(trainThrough)
  const valStart = day(validateFrom)
  if (trainEnd >= valStart) throw new Error("Training and validation windows must not overlap")
  const snapshotDate = records[0].asOfDate
  const snapshotEnd = day(snapshotDate)
  if (trainEnd > snapshotEnd || valStart > snapshotEnd) {
    throw new Error("Future temporal split")
  }
  const seen = new Set<string>()
  const training: TemporalCohortRow[] = []
  const validation: TemporalCohortRow[] = []
  let excludedGapCases = 0
  for (const r of records) {
    if (r.source !== "fjc-idb" || !r.recordId || seen.has(r.recordId) ||
      r.asOfDate !== snapshotDate || r.revision !== records[0].revision ||
      r.datasetId !== records[0].datasetId) throw new Error("Invalid or duplicated source case")
    seen.add(r.recordId)
    const filed = day(r.filedAt)
    if (filed > snapshotEnd) throw new Error("Case filed after source snapshot")
    const terminated = r.terminatedAt === null ? null : day(r.terminatedAt)
    if (terminated !== null && (terminated < filed || terminated > snapshotEnd ||
      r.terminationObserved !== 1) || (terminated === null && r.terminationObserved !== 0)) {
      throw new Error("Invalid termination observability")
    }
    const trainingRow = filed <= trainEnd
    if (!trainingRow && filed < valStart) { excludedGapCases++; continue }
    const observationCutoff = trainingRow ? trainEnd : snapshotEnd
    const observedEvent = terminated !== null && terminated <= observationCutoff
    const eventTime = observedEvent && terminated !== null ? terminated : observationCutoff
    const observedDays = Math.round((eventTime - filed) / 86400000)
    if (observedDays < 0) throw new Error("Invalid negative follow-up")
    const row: TemporalCohortRow = {
      caseId: r.recordId, courtCode: r.courtCode,
      natureOfSuit: r.natureOfSuit, filedAt: r.filedAt,
      observedDays, terminationObserved: observedEvent ? 1 : 0,
    }
    if (trainingRow) training.push(row)
    else validation.push(row)
  }
  return {
    training, validation, excludedGapCases,
    trainingAsOfDate: trainThrough, validationAsOfDate: snapshotDate,
    predictiveModelValidated: false,
  }
}
