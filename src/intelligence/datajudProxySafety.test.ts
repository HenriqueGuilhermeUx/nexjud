import { afterEach, describe, expect, it, vi } from "vitest"
import { datajudSearch } from "../../supabase/functions/_shared/datajud"

afterEach(() => vi.unstubAllGlobals())

const alias = "tjsp"
const query = { size: 1, query: { match: { numeroProcesso: "00082351120058260606" } } }

function configure(secret: string) {
  vi.stubGlobal("Deno", { env: { get: (key: string) => key === "DATAJUD_PROXY_SECRET" ? secret : "" } })
}

describe("DataJud provider and proxy rate-limit safety", () => {
  it("diagnoses direct timeout without leaking a process number or credentials", async () => {
    configure("")
    const info = vi.spyOn(console, "info").mockImplementation(() => {})
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    const mock = vi.fn(async () => { throw new DOMException("timed out", "TimeoutError") })
    vi.stubGlobal("fetch", mock)
    try {
      await expect(datajudSearch(alias, query, "APIKey test-secret")).rejects.toThrow("timed out")
      expect(info).toHaveBeenCalledWith("DataJud proxy configured:", false)
      expect(info).toHaveBeenCalledWith("DataJud route selected:", "direct")
      expect(warn).toHaveBeenCalledWith("DataJud direct transport failed:", "TimeoutError")
      const diagnostic = JSON.stringify([...info.mock.calls, ...warn.mock.calls])
      expect(diagnostic).not.toContain("test-secret")
      expect(diagnostic).not.toContain("00082351120058260606")
    } finally {
      info.mockRestore()
      warn.mockRestore()
    }
  })

  it("returns CNJ 429 without automatic retry in direct mode", async () => {
    configure("")
    const mock = vi.fn(async () => new Response("busy", { status: 429 }))
    vi.stubGlobal("fetch", mock)
    const result = await datajudSearch(alias, query, "APIKey test")
    expect(result.response.status).toBe(429)
    expect(result.via).toBe("direct")
    expect(mock).toHaveBeenCalledTimes(1)
  })

  it("returns proxy 504 without falling back to another CNJ request", async () => {
    configure("test-proxy-secret")
    const mock = vi.fn(async () => new Response("timeout", { status: 504 }))
    vi.stubGlobal("fetch", mock)
    const result = await datajudSearch(alias, query, "APIKey test")
    expect(result.response.status).toBe(504)
    expect(result.via).toBe("netlify")
    expect(mock).toHaveBeenCalledTimes(1)
  })

  it("keeps upstream 429 from marked proxy without direct fallback", async () => {
    configure("test-proxy-secret")
    const mock = vi.fn(async () => new Response("busy", { status: 429, headers: { "x-datajud-via": "netlify" } }))
    vi.stubGlobal("fetch", mock)
    const result = await datajudSearch(alias, query, "APIKey test")
    expect(result.response.status).toBe(429)
    expect(result.via).toBe("netlify")
    expect(mock).toHaveBeenCalledTimes(1)
  })

  it("keeps fallback only for proxy infrastructure rejection", async () => {
    configure("test-proxy-secret")
    const mock = vi.fn()
      .mockResolvedValueOnce(new Response("proxy_not_configured", { status: 503 }))
      .mockResolvedValueOnce(Response.json({ hits: { hits: [] } }))
    vi.stubGlobal("fetch", mock)
    const result = await datajudSearch(alias, query, "APIKey test")
    expect(result.via).toBe("direct")
    expect(result.response.status).toBe(200)
    expect(mock).toHaveBeenCalledTimes(2)
  })
})
