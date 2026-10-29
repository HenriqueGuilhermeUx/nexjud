/**
 * NexJud USA: normalization boundary for CourtListener REST v4 case-law search.
 *
 * Deliberately does NOT infer case outcomes, chances of success, judge scores,
 * case classes, or prediction confidence from snippets or docket metadata.
 * Data is not considered prediction-ready until verified judicial disposition
 * documents have been reviewed and retrospectively validated.
 *
 * Credentials and HTTP fetching belong in a server-side service, never here.
 * Search endpoint documentation:
 * https://www.courtlistener.com/help/api/rest/search/
 */
export interface CourtListenerOpinionSearchHit {
  cluster_id?: number | null
  caseName?: string | null
  court?: string | null
  court_id?: string | null
  dateFiled?: string | null
  docketNumber?: string | null
  absolute_url?: string | null
  citation?: string[] | null
  status?: string | null
  opinions?: Array<{ id?: number | null; type?: string | null; snippet?: string | null }> | null
}

export interface USAOpinionEvidence {
  source: "courtlistener"
  jurisdiction: "US"
  sourceRecordId: string
  caseName: string
  court: string
  courtId?: string
  decidedAt?: string
  docketNumber?: string
  citation: string[]
  publicationStatus?: string
  opinionIds: number[]
  sourceUrl?: string
  collectedAt: string
  /** Search-result metadata is not enough to label an outcome. */
  observedOutcome: null
  outcomeVerified: false
  predictionEligible: false
}

const STRING_MAX = 500
const sanitize = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined
  const s = value.trim()
  // Never clip metadata to form a misleading legal name or citation.
  if (!s || s.length > STRING_MAX || /[\x00-\x1f\x7f<>]/.test(s)) return undefined
  return s
}
const isIsoDate = (value: string | undefined): value is string => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const ts = Date.parse(value + "T00:00:00Z")
  return Number.isFinite(ts) && new Date(ts).toISOString().slice(0,10) === value
}
function validCollectionTime(raw: unknown): boolean {
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(raw)) {
    return false
  }
  const ts = Date.parse(raw)
  return Number.isFinite(ts) && new Date(ts).toISOString().replace(".000Z","Z") === raw
}
function safeCourtListenerUrl(raw: unknown, expectedClusterId: number): string | undefined {
  if (typeof raw !== "string" || raw.length > 300 ||
      !/^\/opinion\/[1-9]\d*\/(?:[A-Za-z0-9._-]+\/?)?$/.test(raw) ||
      raw.includes("..")) return undefined
  const parts = raw.split("/")
  if (parts[2] !== String(expectedClusterId)) return undefined
  try {
    const url = new URL(raw, "https://www.courtlistener.com")
    if (url.origin !== "https://www.courtlistener.com" ||
        url.search || url.hash || url.username || url.password ||
        url.pathname !== raw) return undefined
    return url.href
  } catch {
    return undefined
  }
}

export function normalizeCourtListenerOpinion(
  hit: CourtListenerOpinionSearchHit,
  collectedAt: string,
): USAOpinionEvidence | null {
  if (!Number.isSafeInteger(hit.cluster_id) || (hit.cluster_id ?? 0) <= 0) return null
  const caseName = sanitize(hit.caseName)
  const court = sanitize(hit.court)
  if (!caseName || !court || !validCollectionTime(collectedAt)) return null

  const filed = sanitize(hit.dateFiled)
  const citations = Array.isArray(hit.citation)
    ? [...new Set(hit.citation.map(sanitize).filter((v): v is string => Boolean(v)))]
    : []
  const opinionIds = Array.isArray(hit.opinions)
    ? [...new Set(hit.opinions
      .map(op => op?.id)
      .filter((id): id is number => typeof id === "number" && Number.isSafeInteger(id) && id > 0))]
    : []

  return {
    source: "courtlistener",
    jurisdiction: "US",
    sourceRecordId: String(hit.cluster_id),
    caseName,
    court,
    courtId: sanitize(hit.court_id),
    decidedAt: isIsoDate(filed) ? filed : undefined,
    docketNumber: sanitize(hit.docketNumber),
    citation: citations,
    publicationStatus: sanitize(hit.status),
    opinionIds,
    sourceUrl: safeCourtListenerUrl(hit.absolute_url, hit.cluster_id!),
    collectedAt,
    observedOutcome: null,
    outcomeVerified: false,
    predictionEligible: false,
  }
}

export function normalizeCourtListenerResults(
  hits: CourtListenerOpinionSearchHit[],
  collectedAt: string,
): USAOpinionEvidence[] {
  const unique = new Map<string, USAOpinionEvidence>()
  for (const hit of hits) {
    const record = normalizeCourtListenerOpinion(hit, collectedAt)
    if (record && !unique.has(record.sourceRecordId)) unique.set(record.sourceRecordId, record)
  }
  return [...unique.values()]
}
