/**
 * NexJud USA - CourtListener v4 search client, SERVER ONLY.
 * Import from a backend/Edge Function. Never bundle a CourtListener token in Vite.
 *
 * No route is enabled by this module. No prediction labels are inferred.
 * Source: https://wiki.free.law/c/courtlistener/help/api/rest/v4/search
 */
const ENDPOINT = "https://www.courtlistener.com/api/rest/v4/search/"

export class CourtListenerClientError extends Error {
  constructor(public readonly code: "CONFIG" | "UPSTREAM" | "RESPONSE" | "PAGINATION", public readonly status?: number) {
    super("CourtListener request could not be completed (" + code + ").")
    this.name = "CourtListenerClientError"
  }
}

export interface OpinionSearchRequest {
  query: string
  token: string
  /** Hard capped at three pages; background batch ingestion needs a separate review. */
  maxPages?: number
  /** Inject fetch in tests; the production caller uses server-side fetch. */
  fetchImpl?: typeof fetch
  timeoutMs?: number
}

export interface OpinionSearchResponse {
  /** Untrusted provider results. Pass through the USA evidence normalizer. */
  results: unknown[]
  pagesFetched: number
  hasMore: boolean
  /** CourtListener search count is not a verified population size. */
  reportedCount?: number
}

function validatedContinuation(raw: unknown, query: string): string | null {
  if (raw == null) return null
  if (typeof raw !== "string") throw new CourtListenerClientError("PAGINATION")
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw new CourtListenerClientError("PAGINATION")
  }
  if (
    parsed.origin !== "https://www.courtlistener.com" ||
    parsed.pathname !== "/api/rest/v4/search/" ||
    (parsed.searchParams.get("type") !== null && parsed.searchParams.get("type") !== "o") ||
    parsed.searchParams.get("q") !== query ||
    !parsed.searchParams.has("cursor") ||
    parsed.username || parsed.password || parsed.hash
  ) {
    throw new CourtListenerClientError("PAGINATION")
  }
  return parsed.href
}

export async function searchCourtListenerOpinions(input: OpinionSearchRequest): Promise<OpinionSearchResponse> {
  const query = typeof input.query === "string" ? input.query.trim() : ""
  if (!query || query.length > 200 || /[\r\n]/.test(query)) throw new CourtListenerClientError("CONFIG")
  if (typeof input.token !== "string" || !input.token.trim() || /[\r\n]/.test(input.token)) {
    throw new CourtListenerClientError("CONFIG")
  }
  const pages = input.maxPages ?? 1
  const timeoutMs = input.timeoutMs ?? 7000
  if (!Number.isInteger(pages) || pages < 1 || pages > 3 ||
      !Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 15000) {
    throw new CourtListenerClientError("CONFIG")
  }

  const first = new URL(ENDPOINT)
  first.searchParams.set("type", "o")
  first.searchParams.set("q", query)
  let nextUrl: string | null = first.href
  let pagesFetched = 0
  let reportedCount: number | undefined
  const results: unknown[] = []
  const seenUrls = new Set<string>()
  const fetchImpl = input.fetchImpl ?? fetch

  while (nextUrl && pagesFetched < pages) {
    if (seenUrls.has(nextUrl)) throw new CourtListenerClientError("PAGINATION")
    seenUrls.add(nextUrl)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    let response: Response
    try {
      response = await fetchImpl(nextUrl, {
        method: "GET",
        headers: { Authorization: "Token " + input.token.trim(), Accept: "application/json" },
        signal: controller.signal,
        redirect: "error",
        cache: "no-store",
      })
    } catch {
      throw new CourtListenerClientError("UPSTREAM")
    } finally {
      clearTimeout(timer)
    }
    if (!response.ok) throw new CourtListenerClientError("UPSTREAM", response.status)
    let payload: unknown
    try {
      payload = await response.json()
    } catch {
      throw new CourtListenerClientError("RESPONSE")
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new CourtListenerClientError("RESPONSE")
    }
    const page = payload as Record<string, unknown>
    if (!Array.isArray(page.results)) throw new CourtListenerClientError("RESPONSE")
    if (page.results.length > 1000) throw new CourtListenerClientError("RESPONSE")
    // Never treat snippets as disposition or outcomes.
    results.push(...page.results)
    pagesFetched += 1
    if (pagesFetched === 1 && typeof page.count === "number" &&
        Number.isSafeInteger(page.count) && page.count >= 0) {
      reportedCount = page.count
    }
    nextUrl = validatedContinuation(page.next, query)
  }
  return { results, pagesFetched, hasMore: nextUrl !== null, reportedCount }
}
