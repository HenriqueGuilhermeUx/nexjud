/**
 * NexJud USA — ACTUALLY FITTED categorical logistic model, OFFLINE RESEARCH.
 *
 * Fits case-termination-by-H using only filing-time administrative features:
 * court code and nature-of-suit code. It never learns judge outcomes, success,
 * litigant identity or merits. No case-specific forecasts are returned.
 *
 * This is not approved, calibrated, or validated on an authentic FJC extract.
 * Retrospective re-censoring also does not equal an archived historic snapshot.
 */
import type { FJCTemporalSplit, TemporalCohortRow } from "./fjcTemporalSplit"

export interface USFJCTerminationFeatureBenchmark {
  kind: "synthetic_first_fjc_termination_feature_benchmark"
  status: "RESEARCH_FEATURE_MODEL" | "ABSTAIN_INCOMPLETE_FOLLOWUP" | "ABSTAIN_INSUFFICIENT_OR_UNSEEN_GROUP"
  horizonDays: number
  trainingN: number
  holdoutN: number
  trainingUnobservedN: number
  holdoutUnobservedN: number
  courtCategories: number
  natureOfSuitCategories: number
  fittedFeatureModel: boolean
  historicalUnconditionalBrier: number | null
  heldoutFeatureModelBrier: number | null
  heldoutImprovementBrier: number | null
  /** Strictly descriptive holdout log loss, NOT legal outcome calibration. */
  historicalUnconditionalLogLoss: number | null
  heldoutFeatureModelLogLoss: number | null
  /** Null unless at least two populated bins each contain >=15 cases. */
  holdoutExpectedCalibrationError5: number | null
  calibrationDiagnosticStatus: "SUPPRESSED" | "DESCRIPTIVE_HOLDOUT_ONLY"
  outOfTimeEvaluationPerformed: boolean
  featureSet: readonly ["courtCode", "natureOfSuit"]
  outcome: "administrative_termination_by_horizon_not_case_win"
  independentExternalValidationComplete: false
  genuineHistoricalSnapshotVerified: false
  realFJCSourceAuthenticated: false
  calibratedLegalCasePrediction: false
  individualForecastEnabled: false
}

const utcDay = (str: string): number => {
  if (typeof str !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    throw new Error("Invalid FJC filing date")
  }
  const ms = Date.parse(str + "T00:00:00Z")
  if (!Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== str) {
    throw new Error("Invalid FJC filing date")
  }
  return ms
}
const cleanCategory = (v: unknown): v is string =>
  typeof v === "string" && /^[A-Za-z0-9_.:-]{1,30}$/.test(v)
const label = (r: TemporalCohortRow, horizon: number): 0 | 1 | null => {
  if (r.terminationObserved === 1 && r.observedDays <= horizon) return 1
  if (r.observedDays >= horizon) return 0
  return null
}
const sigmoid = (x: number) => x < 0
  ? Math.exp(x) / (1 + Math.exp(x))
  : 1 / (1 + Math.exp(-x))

export function benchmarkUSFJCTerminationFeatureModel(
  split: FJCTemporalSplit,
  horizonDays: number,
): USFJCTerminationFeatureBenchmark {
  if (!split || !Array.isArray(split.training) || !Array.isArray(split.validation) ||
      split.predictiveModelValidated !== false ||
      !Number.isSafeInteger(horizonDays) || horizonDays < 1 || horizonDays > 36500 ||
      split.training.length + split.validation.length > 10000) {
    throw new Error("Invalid feature benchmark input")
  }
  const trainEnd = utcDay(split.trainingAsOfDate)
  const validEnd = utcDay(split.validationAsOfDate)
  if (trainEnd >= validEnd) throw new Error("Invalid FJC chronology")
  const seen = new Set<string>()
  const all = [
    { rows: split.training, cutoff: trainEnd, train: true },
    { rows: split.validation, cutoff: validEnd, train: false },
  ]
  for (const part of all) for (const r of part.rows) {
    if (!r || typeof r.caseId !== "string" || r.caseId.length < 1 ||
        seen.has(r.caseId) || !cleanCategory(r.courtCode) ||
        !cleanCategory(r.natureOfSuit) ||
        !Number.isSafeInteger(r.observedDays) || r.observedDays < 0 ||
        (r.terminationObserved !== 0 && r.terminationObserved !== 1)) {
      throw new Error("Invalid or duplicated FJC feature record")
    }
    seen.add(r.caseId)
    const filed = utcDay(r.filedAt)
    if (filed > part.cutoff || (part.train ? filed > trainEnd : filed <= trainEnd) ||
        r.observedDays > Math.round((part.cutoff - filed) / 86400000)) {
      throw new Error("FJC feature observation exceeds temporal cutoff")
    }
  }

  const trainingLabels = split.training.map(r => label(r, horizonDays))
  const validationLabels = split.validation.map(r => label(r, horizonDays))
  const trainUnavailable = trainingLabels.filter(v => v === null).length
  const validUnavailable = validationLabels.filter(v => v === null).length
  const counts = (labels: (0|1|null)[]) => [
    labels.filter(v => v === 1).length, labels.filter(v => v === 0).length,
  ]
  const [trainYes, trainNo] = counts(trainingLabels)
  const [validYes, validNo] = counts(validationLabels)
  const courts = [...new Set(split.training.map(r => r.courtCode))].sort()
  const suits = [...new Set(split.training.map(r => r.natureOfSuit))].sort()
  const unseen = split.validation.some(r => !courts.includes(r.courtCode) ||
    !suits.includes(r.natureOfSuit))
  const coverage = [...courts.map(c => [
    split.training.filter(x => x.courtCode === c).length,
    split.validation.filter(x => x.courtCode === c).length,
  ]), ...suits.map(n => [
    split.training.filter(x => x.natureOfSuit === n).length,
    split.validation.filter(x => x.natureOfSuit === n).length,
  ])]
  // Conservative ENGINEERING gates, not scientific validation. No unknown
  // categories and no single-class fitting or validation allowed.
  const adequate = split.training.length >= 120 && split.validation.length >= 80 &&
    courts.length >= 2 && suits.length >= 2 && !unseen &&
    trainYes >= 20 && trainNo >= 20 && validYes >= 20 && validNo >= 20 &&
    coverage.every(([a,b]) => a >= 20 && b >= 15)
  const status: USFJCTerminationFeatureBenchmark["status"] =
    trainUnavailable || validUnavailable ? "ABSTAIN_INCOMPLETE_FOLLOWUP"
    : adequate ? "RESEARCH_FEATURE_MODEL" : "ABSTAIN_INSUFFICIENT_OR_UNSEEN_GROUP"

  const blank: USFJCTerminationFeatureBenchmark = {
    kind: "synthetic_first_fjc_termination_feature_benchmark",
    status, horizonDays, trainingN: split.training.length, holdoutN: split.validation.length,
    trainingUnobservedN: trainUnavailable, holdoutUnobservedN: validUnavailable,
    courtCategories: courts.length, natureOfSuitCategories: suits.length,
    fittedFeatureModel: false, historicalUnconditionalBrier: null,
    heldoutFeatureModelBrier: null, heldoutImprovementBrier: null,
    historicalUnconditionalLogLoss: null, heldoutFeatureModelLogLoss: null,
    holdoutExpectedCalibrationError5: null, calibrationDiagnosticStatus: "SUPPRESSED",
    outOfTimeEvaluationPerformed: false, featureSet: ["courtCode","natureOfSuit"],
    outcome: "administrative_termination_by_horizon_not_case_win",
    independentExternalValidationComplete: false,
    genuineHistoricalSnapshotVerified: false,
    realFJCSourceAuthenticated: false,
    calibratedLegalCasePrediction: false, individualForecastEnabled: false,
  }
  if (!adequate || status !== "RESEARCH_FEATURE_MODEL") return blank

  const positions = (r: TemporalCohortRow) => [
    courts.indexOf(r.courtCode) + 1,
    suits.indexOf(r.natureOfSuit) + 1 + courts.length,
  ]
  const weights = new Array(1 + courts.length + suits.length).fill(0) as number[]
  const labels = trainingLabels as (0|1)[]
  // Fixed, deterministic batch gradient descent with L2 on category
  // coefficients. Feature vocabulary is FIT on training exclusively.
  for (let epoch = 0; epoch < 500; epoch++) {
    const gradients = weights.map(() => 0)
    for (let i = 0; i < split.training.length; i++) {
      const [court, suit] = positions(split.training[i])
      const error = sigmoid(weights[0] + weights[court] + weights[suit]) - labels[i]
      gradients[0] += error
      gradients[court] += error
      gradients[suit] += error
    }
    for (let k = 0; k < weights.length; k++) {
      const regularizer = k === 0 ? 0 : 0.02 * weights[k]
      weights[k] -= 0.5 * (gradients[k] / split.training.length + regularizer)
    }
  }
  if (weights.some(w => !Number.isFinite(w))) throw new Error("Divergent fitted research model")
  const baseRate = trainYes / split.training.length
  let baselineSum = 0, fittedSum = 0
  let baselineLogLoss = 0, fittedLogLoss = 0
  const bins = Array.from({length: 5}, () => ({n: 0, predicted: 0, observed: 0}))
  const safeLogLoss = (p: number, y: 0|1) => {
    const bounded = Math.min(1 - 1e-12, Math.max(1e-12, p))
    return -(y * Math.log(bounded) + (1 - y) * Math.log(1 - bounded))
  }
  for (let i = 0; i < split.validation.length; i++) {
    const [court,suit] = positions(split.validation[i])
    const prob = sigmoid(weights[0] + weights[court] + weights[suit])
    const y = validationLabels[i] as 0|1
    baselineSum += (baseRate - y) ** 2
    fittedSum += (prob - y) ** 2
    baselineLogLoss += safeLogLoss(baseRate, y)
    fittedLogLoss += safeLogLoss(prob, y)
    const bin = bins[Math.min(4, Math.floor(prob * 5))]
    bin.n += 1
    bin.predicted += prob
    bin.observed += y
  }
  const baseline = baselineSum / split.validation.length
  const fitted = fittedSum / split.validation.length
  const populated = bins.filter(bin => bin.n > 0)
  // Suppress diagnostics from tiny prediction buckets: even aggregate ECE
  // on very small synthetic bins invites spurious "well calibrated" claims.
  const diagnosticSafe = populated.length >= 2 && populated.every(bin => bin.n >= 15)
  const ece = diagnosticSafe ? populated.reduce((sum, bin) =>
    sum + (bin.n / split.validation.length) *
      Math.abs(bin.predicted / bin.n - bin.observed / bin.n), 0) : null
  return {
    ...blank, fittedFeatureModel: true,
    historicalUnconditionalBrier: baseline,
    heldoutFeatureModelBrier: fitted,
    heldoutImprovementBrier: baseline - fitted,
    historicalUnconditionalLogLoss: baselineLogLoss / split.validation.length,
    heldoutFeatureModelLogLoss: fittedLogLoss / split.validation.length,
    holdoutExpectedCalibrationError5: ece,
    calibrationDiagnosticStatus: diagnosticSafe ? "DESCRIPTIVE_HOLDOUT_ONLY" : "SUPPRESSED",
    outOfTimeEvaluationPerformed: true,
  }
}
