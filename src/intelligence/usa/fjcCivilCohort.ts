/**
 * NexJud USA - FJC IDB civil cohort normalization, OFFLINE AND SYNTHETIC FIRST.
 *
 * No field names or outcome codes are guessed. The analyst must supply a
 * codebook-reviewed, per-release mapping. These are time-to-termination
 * observations (including right-censored pending cases), NOT win/loss labels.
 */
export interface FJCCivilFieldMap {
  recordId: string
  courtCode: string
  natureOfSuit: string
  filedDate: string
  terminatedDate: string
}

export interface FJCCivilManifest {
  datasetId: string
  revision: string
  releaseSha256: string
  sourceUrl: string
  codebookUrl: string
  /** Snapshot cutoff for all dates and censoring, YYYY-MM-DD */
  asOfDate: string
  /** Explicit analyst signoff; does not constitute legal certification. */
  codebookMappingReviewed: true
  /** Source data is approved for this isolated research use. */
  useRightsReviewed: true
  fields: FJCCivilFieldMap
}

export interface FJCNormalizedCivilCase {
  source: "fjc-idb"
  datasetId: string
  revision: string
  asOfDate: string
  recordId: string
  courtCode: string
  natureOfSuit: string
  filedAt: string
  terminatedAt: string | null
  /** Days observed since filing, through termination OR right-censor cutoff. */
  observedDays: number
  /** 1 = case termination observed, NOT success; 0 = right-censored. */
  terminationObserved: 0 | 1
  predictiveOutcomeLabel: null
}

function isoDay(s: unknown): number | null {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null
  const t = Date.parse(s + "T00:00:00Z")
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === s ? t : null
}

function required(v: unknown, label: string, max = 160): string {
  if (typeof v !== "string" || !v.trim() || v.trim().length > max ||
      /[\r\n\x00-\x1f]/.test(v)) throw new Error("Invalid " + label)
  return v.trim()
}

function verifiedFjcUrl(raw: string): boolean {
  try {
    const u = new URL(raw)
    return u.protocol === "https:" && (u.hostname === "fjc.gov" || u.hostname.endsWith(".fjc.gov")) &&
      !u.username && !u.password && !u.hash
  } catch { return false }
}

function assertManifest(m: FJCCivilManifest): number {
  if (!m || m.codebookMappingReviewed !== true || m.useRightsReviewed !== true ||
    !/^[a-f0-9]{64}$/i.test(m.releaseSha256 || "") ||
    !verifiedFjcUrl(m.sourceUrl) || !verifiedFjcUrl(m.codebookUrl)) {
    throw new Error("Unverified FJC source manifest")
  }
  required(m.datasetId, "datasetId")
  required(m.revision, "revision")
  const asOf = isoDay(m.asOfDate)
  if (asOf === null) throw new Error("Invalid dataset as-of date")
  if (!m.fields || Object.values(m.fields).length !== 5 ||
      new Set(Object.values(m.fields)).size !== 5 ||
      Object.values(m.fields).some(v => typeof v !== "string" || !v.trim())) {
    throw new Error("Missing codebook-reviewed field mapping")
  }
  return asOf
}

/**
 * Strictly maps an approved dataset extract, not a guessed FJC schema.
 * Rejects bad data rather than silently dropping difficult/biased records.
 * Dataset-scale pipelines should stream and deduplicate before invoking this.
 */
export function normalizeFJCCivilExtract(
  rows: Record<string, unknown>[],
  manifest: FJCCivilManifest,
): FJCNormalizedCivilCase[] {
  const cutoff = assertManifest(manifest)
  if (!Array.isArray(rows) || rows.length > 10000) throw new Error("Batch limit exceeded")
  const seen = new Set<string>()
  return rows.map((row, i) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error("Invalid record " + i)
    const f = manifest.fields
    const recordId = required(row[f.recordId], "recordId")
    if (seen.has(recordId)) throw new Error("Duplicate FJC record in extract")
    seen.add(recordId)
    const courtCode = required(row[f.courtCode], "courtCode", 80)
    const natureOfSuit = required(row[f.natureOfSuit], "natureOfSuit", 80)
    const filedValue = row[f.filedDate]
    const filedTime = isoDay(filedValue)
    if (filedTime === null || filedTime > cutoff) throw new Error("Invalid or future filing date")
    const terminationValue = row[f.terminatedDate]
    const hasTermination = terminationValue !== null && terminationValue !== undefined && terminationValue !== ""
    const terminalTime = hasTermination ? isoDay(terminationValue) : null
    if (hasTermination && (terminalTime === null || terminalTime < filedTime || terminalTime > cutoff)) {
      throw new Error("Invalid or future termination date")
    }
    const observedDays = Math.round(((terminalTime ?? cutoff) - filedTime) / 86400000)
    return {
      source: "fjc-idb" as const,
      datasetId: manifest.datasetId,
      revision: manifest.revision,
      asOfDate: manifest.asOfDate,
      recordId, courtCode, natureOfSuit,
      filedAt: filedValue as string,
      terminatedAt: hasTermination ? terminationValue as string : null,
      observedDays,
      terminationObserved: hasTermination ? 1 as const : 0 as const,
      predictiveOutcomeLabel: null,
    }
  })
}

export function summarizeFJCCivilExtract(rows: FJCNormalizedCivilCase[]) {
  if (!Array.isArray(rows)) throw new Error("Invalid cohort")
  const observedTerminations = rows.filter(r => r.terminationObserved === 1).length
  const rightCensored = rows.length - observedTerminations
  return {
    n: rows.length,
    observedTerminations,
    rightCensored,
    /** Only completeness description. NOT a duration prediction or outcome probability. */
    censoredFraction: rows.length ? rightCensored / rows.length : null,
    predictiveModelValidated: false as const,
  }
}
