import { describe, expect, it, vi } from "vitest"
import {
  CourtListenerClientError,
  searchCourtListenerOpinions,
} from "../../../supabase/functions/_shared/usa/courtListenerClient"

const token = "test-token-never-real"
const query = "contract breach"
const nextUrl = "https://www.courtlistener.com/api/rest/v4/search/?type=o&q=contract+breach&cursor=abc"
const hit = { cluster_id: 6613686, caseName: "Foo v. Foo", court: "Example Court" }

function page(results: unknown[], next: string | null = null, count = 1) {
  return Response.json({ count, next, previous: null, results })
}
function mockFetch(...responses: Response[]) {
  const impl = vi.fn(async () => responses.shift() ?? page([]))
  return impl as unknown as typeof fetch
}

describe("CourtListener server-only USA client (mocked; no live API calls)", () => {
  it("authenticates to the fixed v4 opinion endpoint without disclosing its token in the URL", async () => {
    const f = mockFetch(page([hit]))
    const data = await searchCourtListenerOpinions({ query, token, fetchImpl: f })
    expect(data).toEqual({ results: [hit], pagesFetched: 1, hasMore: false, reportedCount: 1 })
    const [url, opts] = (f as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit]
    expect(url).toContain("/api/rest/v4/search/?type=o&q=contract+breach")
    expect(url).not.toContain(token)
    expect((opts.headers as Record<string, string>).Authorization).toBe("Token " + token)
    expect(opts.redirect).toBe("error")
  })

  it("follows only first-party cursor pagination within the configured page budget", async () => {
    const f = mockFetch(page([hit], nextUrl, 2), page([{ ...hit, cluster_id: 2 }]))
    const data = await searchCourtListenerOpinions({ query, token, maxPages: 2, fetchImpl: f })
    expect(data.results).toHaveLength(2)
    expect(data.pagesFetched).toBe(2)
    expect(f).toHaveBeenCalledTimes(2)
  })

  it("returns hasMore when maxPages stops before continuation", async () => {
    const result = await searchCourtListenerOpinions({
      query, token, fetchImpl: mockFetch(page([hit], nextUrl)),
    })
    expect(result.hasMore).toBe(true)
    expect(result.pagesFetched).toBe(1)
  })

  it.each([
    "https://attacker.example/api/rest/v4/search/?type=o&q=contract+breach&cursor=abc",
    "https://www.courtlistener.com/other/?type=o&q=contract+breach&cursor=abc",
    "https://www.courtlistener.com/api/rest/v4/search/?type=o&q=unrelated&cursor=abc",
    "https://www.courtlistener.com/api/rest/v4/search/?type=d&q=contract+breach&cursor=abc",
  ])("rejects provider continuation outside the locked origin, path, query or type", async (next) => {
    await expect(searchCourtListenerOpinions({
      query, token, maxPages: 2, fetchImpl: mockFetch(page([hit], next)),
    })).rejects.toMatchObject({ code: "PAGINATION" })
  })

  it("rejects malformed payloads rather than silently inventing data", async () => {
    const f = mockFetch(Response.json({ results: { bad: true } }))
    await expect(searchCourtListenerOpinions({ query, token, fetchImpl: f }))
      .rejects.toMatchObject({ code: "RESPONSE" })
  })

  it("surfaces upstream HTTP status without leaking response body or credentials", async () => {
    const f = mockFetch(new Response("sensitive provider response", { status: 429 }))
    await expect(searchCourtListenerOpinions({ query, token, fetchImpl: f }))
      .rejects.toMatchObject({ code: "UPSTREAM", status: 429 })
    expect(new CourtListenerClientError("UPSTREAM", 429).message).not.toContain(token)
  })

  it("fails closed for invalid queries, tokens, and unbounded crawling", async () => {
    const f = mockFetch(page([hit]))
    await expect(searchCourtListenerOpinions({ query: "", token, fetchImpl: f }))
      .rejects.toMatchObject({ code: "CONFIG" })
    await expect(searchCourtListenerOpinions({ query, token: "", fetchImpl: f }))
      .rejects.toMatchObject({ code: "CONFIG" })
    await expect(searchCourtListenerOpinions({ query, token, maxPages: 4, fetchImpl: f }))
      .rejects.toMatchObject({ code: "CONFIG" })
    expect(f).not.toHaveBeenCalled()
  })
})
