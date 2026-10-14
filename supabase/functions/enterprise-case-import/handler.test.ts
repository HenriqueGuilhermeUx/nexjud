import { describe, expect, it, vi } from "vitest"
import { handleImportRequest, type ImportHttpRuntime } from "./handler"

const ORIGIN = "https://nexjud.example"
const sample = {
  organizationId: "cccccccc-9999-4999-8999-999999999999",
  idempotencyKey: "batch-1",
  items: [{ externalId: "case-1", sourceSystem: "crm", cnjDigits: "00000000002026826000" }],
}
function createRuntime(overrides: Partial<ImportHttpRuntime> = {}) {
  const verifyUser = vi.fn(async () => true)
  const commit = vi.fn(async () => ({
    data: { status: "created", receipt: { itemCount: 1 } },
    error: null as {code?: string} | null,
  }))
  const runtime: ImportHttpRuntime = {
    allowedOrigins: [ORIGIN],
    configured: true,
    verifyUser,
    commit,
    ...overrides,
  }
  return { runtime, verifyUser, commit }
}
const endpoint = "https://fn.example/enterprise-case-import"
function request(body: unknown = sample, extra: Record<string, string> = {}) {
  return new Request(endpoint, {
    method: "POST",
    headers: { "authorization": "Bearer token-a", "origin": ORIGIN, ...extra },
    body: JSON.stringify(body),
  })
}
describe("enterprise import HTTP handler (executable request/response tests)", () => {
  it("responds to allowed CORS preflight, rejects unapproved origin", async () => {
    const { runtime } = createRuntime()
    const yes = await handleImportRequest(new Request(endpoint, {
      method: "OPTIONS", headers: { origin: ORIGIN },
    }), runtime)
    expect(yes.status).toBe(204)
    expect(yes.headers.get("access-control-allow-origin")).toBe(ORIGIN)
    const no = await handleImportRequest(new Request(endpoint, {
      method: "OPTIONS", headers: { origin: "https://untrusted.example" },
    }), runtime)
    expect(no.status).toBe(403)
  })
  it("does not authorize from an invalid or missing JWT", async () => {
    const { runtime, commit } = createRuntime({ verifyUser: async () => false })
    expect((await handleImportRequest(request(), runtime)).status).toBe(401)
    const missing = request(sample, { authorization: "" })
    expect((await handleImportRequest(missing, runtime)).status).toBe(401)
    expect(commit).not.toHaveBeenCalled()
  })
  it("does not disclose private API errors", async () => {
    const { runtime } = createRuntime({ verifyUser: async () => { throw new Error("secret") } })
    const response = await handleImportRequest(request(), runtime)
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ error: "unavailable" })
  })
  it("blocks malformed imports before commit", async () => {
    const { runtime, commit } = createRuntime()
    const result = await handleImportRequest(request({ ...sample, actorId: "forged" }), runtime)
    expect(result.status).toBe(400)
    expect(commit).not.toHaveBeenCalled()
  })
  it("enforces request body bytes despite a forged small content-length", async () => {
    const { runtime, commit } = createRuntime()
    const big = { ...sample, extra: "X".repeat(512_001) }
    const result = await handleImportRequest(request(big, { "content-length": "10" }), runtime)
    expect(result.status).toBe(413)
    expect(commit).not.toHaveBeenCalled()
  })
  it("maps create to 201 and forwards the verified caller JWT", async () => {
    const { runtime, verifyUser, commit } = createRuntime()
    const result = await handleImportRequest(request(), runtime)
    expect(result.status).toBe(201)
    expect(verifyUser).toHaveBeenCalledWith("token-a")
    expect(commit).toHaveBeenCalledWith("token-a", sample)
  })
  it("maps idempotent replay to 200", async () => {
    const { runtime } = createRuntime({ commit: async () => ({
      data: { status: "already_processed", receipt: { itemCount: 1 } }, error: null,
    }) })
    expect((await handleImportRequest(request(), runtime)).status).toBe(200)
  })
  it.each([
    ["23505", 409], ["42501", 403], ["28000", 401],
    ["22023", 400], ["23514", 400], ["40001", 503],
  ])("maps PostgreSQL code %s to HTTP %s", async (code, expected) => {
    const { runtime } = createRuntime({ commit: async () => ({
      data: null, error: { code: String(code) },
    }) })
    expect((await handleImportRequest(request(), runtime)).status).toBe(expected)
  })
  it("fails closed on unexpected gateway response", async () => {
    const { runtime } = createRuntime({ commit: async () => ({ data: {}, error: null }) })
    expect((await handleImportRequest(request(), runtime)).status).toBe(503)
  })
  it("blocks requests with no configured backend", async () => {
    const { runtime, verifyUser } = createRuntime({ configured: false })
    expect((await handleImportRequest(request(), runtime)).status).toBe(503)
    expect(verifyUser).not.toHaveBeenCalled()
  })
  it("rejects cross-origin POST before checking auth", async () => {
    const { runtime, verifyUser } = createRuntime()
    const result = await handleImportRequest(request(sample, { origin: "https://fake.example" }), runtime)
    expect(result.status).toBe(403)
    expect(verifyUser).not.toHaveBeenCalled()
  })
})
