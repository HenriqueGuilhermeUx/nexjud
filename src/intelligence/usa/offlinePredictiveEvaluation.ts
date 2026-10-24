/**
 * NexJud USA - OFFLINE validation diagnostics, not a trained predictor.
 *
 * Accepts *audited holdout* forecasts with binary verified outcome labels.
 * Does not certify that a sample is unbiased or leakage-free, and must never
 * be used to fabricate user-facing predictions. Only report diagnostics after
 * signed dataset/model lineage, temporal validation and legal review.
 */
export interface AuditedForecastRow {
  caseId: string
  forecastAt: string
  outcomeVerifiedAt: string
  verifiedSourceUrl: string
  observedOutcome: 0 | 1
  predictedProbability: number
}

export interface ReliabilityBin {
  count: number
  meanPredicted: number | null
  observedRate: number | null
}

export interface OfflineEvaluation {
  n: number
  brierScore: number
  baselineBrierScore: number
  logLoss: number
  outcomeRate: number
  reliability: ReliabilityBin[]
}

function validDate(value: string): number | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(value)) return null
  const t = Date.parse(value)
  return Number.isFinite(t) ? t : null
}

/** Returns null when sample size is too small; throws for unauditable inputs. */
export function evaluateAuditedHoldout(
  rows: AuditedForecastRow[],
  trainingBaseRate: number,
  minSample = 50,
): OfflineEvaluation | null {
  if (!Array.isArray(rows) || !Number.isInteger(minSample) || minSample < 50 ||
      !Number.isFinite(trainingBaseRate) || trainingBaseRate < 0 || trainingBaseRate > 1) {
    throw new Error("Invalid offline evaluation configuration.")
  }
  const ids = new Set<string>()
  let brier = 0
  let baseline = 0
  let loss = 0
  let observed = 0
  const bins = Array.from({ length: 10 }, () => ({ count: 0, predicted: 0, outcomes: 0 }))
  for (const r of rows) {
    const forecastTime = validDate(r?.forecastAt)
    const observedTime = validDate(r?.outcomeVerifiedAt)
    let url: URL
    try { url = new URL(r?.verifiedSourceUrl) } catch { throw new Error("Unverified outcome provenance.") }
    if (!r?.caseId?.trim() || ids.has(r.caseId) ||
        !forecastTime || !observedTime || forecastTime >= observedTime ||
        url.protocol !== "https:" || !url.hostname ||
        (r.observedOutcome !== 0 && r.observedOutcome !== 1) ||
        !Number.isFinite(r.predictedProbability) ||
        r.predictedProbability < 0 || r.predictedProbability > 1) {
      throw new Error("Unverified outcome or invalid chronological prediction data.")
    }
    ids.add(r.caseId)
    const p = r.predictedProbability
    const y = r.observedOutcome
    brier += (p - y) ** 2
    baseline += (trainingBaseRate - y) ** 2
    loss += -(y * Math.log(Math.max(p, 1e-15)) + (1 - y) * Math.log(Math.max(1 - p, 1e-15)))
    observed += y
    const bin = bins[Math.min(9, Math.floor(p * 10))]
    bin.count += 1
    bin.predicted += p
    bin.outcomes += y
  }
  if (rows.length < minSample) return null
  return {
    n: rows.length,
    brierScore: brier / rows.length,
    baselineBrierScore: baseline / rows.length,
    logLoss: loss / rows.length,
    outcomeRate: observed / rows.length,
    reliability: bins.map(b => ({
      count: b.count,
      meanPredicted: b.count ? b.predicted / b.count : null,
      observedRate: b.count ? b.outcomes / b.count : null,
    })),
  }
}
