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
const sanitize = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim()
    ? value.trim().slice(0, STRING_MAX)
    : undefined

const isIsoDate = (value: string | undefined): value is string =>
  Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value + "T00:00:00Z")))

function safeCourtListenerUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string" || !/^\/opinion\/\d+\//.test(raw)) return undefined
  try {
    const url = new URL(raw, "https://www.courtlistener.com")
    if (url.origin !== "https://www.courtlistener.com") return undefined
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
  if (!caseName || !court || !collectedAt || Number.isNaN(Date.parse(collectedAt))) return null

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
    sourceUrl: safeCourtListenerUrl(hit.absolute_url),
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
