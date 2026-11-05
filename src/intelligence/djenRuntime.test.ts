import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import handler from "../../netlify/functions/djen-process.mjs"

const previousUrl = process.env.SUPABASE_URL
const previousKey = process.env.SUPABASE_ANON_KEY
const processNumber = "00012345620268260001"

function invoke(query = processNumber, auth = "Bearer valid-test-token") {
  return handler(new Request(
    "https://nexjudsolucoes.com.br/.netlify/functions/djen-process?process=" + query,
    { method: "GET", headers: { Authorization: auth, Origin: "https://nexjudsolucoes.com.br" } },
  ))
}

beforeEach(() => {
  process.env.SUPABASE_URL = "https://supabase-test.example"
  process.env.SUPABASE_ANON_KEY = "public-anon-test"
})
afterEach(() => {
  vi.unstubAllGlobals()
  if (previousUrl === undefined) delete process.env.SUPABASE_URL
  else process.env.SUPABASE_URL = previousUrl
  if (previousKey === undefined) delete process.env.SUPABASE_ANON_KEY
  else process.env.SUPABASE_ANON_KEY = previousKey
})

describe("Netlify DJEN runtime regression", () => {
  it("returns 401 before consulting CNJ when the session is rejected", async () => {
    const calls: string[] = []
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      calls.push(String(input))
      return Response.json({ message: "invalid token" }, { status: 401 })
    }))
    const res = await invoke()
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: "invalid_session" })
    expect(calls).toEqual(["https://supabase-test.example/auth/v1/user"])
  })

  it.each([500, 502, 503])("returns 503 without consulting CNJ when session verifier fails (%s)", async (status) => {
    const calls: string[] = []
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      calls.push(String(input))
      return new Response("verifier temporarily unavailable", { status })
    }))
    const res = await invoke()
    expect(res.status).toBe(503)
    expect((await res.json()).error).toBe("authentication_verifier_unavailable")
    expect(calls).toEqual(["https://supabase-test.example/auth/v1/user"])
  })

  it("reports auth-provider network failure as 503 and never contacts CNJ", async () => {
    const calls: string[] = []
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      calls.push(String(input))
      throw new TypeError("network failure")
    }))
    const res = await invoke()
    expect(res.status).toBe(503)
    expect((await res.json()).error).toBe("authentication_verifier_unavailable")
    expect(calls).toEqual(["https://supabase-test.example/auth/v1/user"])
  })

  it("does not mistake malformed session-verifier response for invalid credentials", async () => {
    const calls: string[] = []
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      calls.push(String(input))
      return new Response("not JSON", { status: 200 })
    }))
    const res = await invoke()
    expect(res.status).toBe(503)
    expect((await res.json()).error).toBe("authentication_verifier_unavailable")
    expect(calls).toEqual(["https://supabase-test.example/auth/v1/user"])
  })

  it("authenticates, calls CNJ once with bounded page/size, and strips private text", async () => {
    const calls: string[] = []
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      calls.push(url)
      if (url.endsWith("/auth/v1/user")) return Response.json({ id: "verified-user" })
      const parsed = new URL(url)
      expect(parsed.hostname).toBe("comunicaapi.pje.jus.br")
      expect(parsed.searchParams.get("numeroProcesso")).toBe(processNumber)
      expect(parsed.searchParams.get("page")).toBe("0")
      expect(parsed.searchParams.get("size")).toBe("5")
      expect(parsed.searchParams.has("nomeParte")).toBe(false)
      return Response.json({
        count: 1,
        items: [{
          id: "published-decision-test", numeroProcesso: processNumber,
          tipoDocumento: "Sentença", siglaTribunal: "TJSP", nomeOrgao: "Vara",
          link: "https://esaj.tjsp.jus.br/doc/1",
          texto: "CPF 123.456.789-00 conteúdo privado",
          nomeDestinatario: "Pessoa Privada",
        }],
      })
    }))
    const res = await invoke()
    expect(res.status).toBe(200)
    expect(calls).toHaveLength(2)
    const body = await res.json()
    expect(body.items).toHaveLength(1)
    expect(body.items[0].confirmedDecision).toBe(false)
    expect(body.items[0].identifiedJudge).toBe(false)
    expect(JSON.stringify(body)).not.toContain("Pessoa Privada")
    expect(JSON.stringify(body)).not.toContain("123.456.789-00")
    expect(res.headers.get("cache-control")).toBe("no-store")
  })

  it.each([
    [403, "cnj_access_restricted"],
    [400, "cnj_query_rejected"],
    [422, "cnj_query_rejected"],
  ])("reports restricted or rejected CNJ response %s without leaking document text", async (code, errorCode) => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith("/auth/v1/user")) return Response.json({ id: "unique-" + code })
      return new Response("CPF 123.456.789-00 confidential upstream content", { status: code })
    }))
    const res = await invoke()
    expect(res.status).toBe(502)
    const body = await res.json()
    expect(body.error).toBe(errorCode)
    expect(JSON.stringify(body)).not.toContain("123.456.789-00")
  })

  it("distinguishes malformed public payload from legitimately empty results", async () => {
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith("/auth/v1/user")) return Response.json({ id: "malformed-response-account" })
      return Response.json({ data: [{ text: "private" }] })
    }))
    const res = await invoke()
    expect(res.status).toBe(502)
    expect((await res.json()).error).toBe("cnj_unexpected_format")
  })

  it("rejects missing auth and invalid CNJ without contacting providers", async () => {
    const mock = vi.fn()
    vi.stubGlobal("fetch", mock)
    expect((await invoke("1234")).status).toBe(400)
    expect((await invoke(processNumber, "")).status).toBe(401)
    expect(mock).not.toHaveBeenCalled()
  })
})
