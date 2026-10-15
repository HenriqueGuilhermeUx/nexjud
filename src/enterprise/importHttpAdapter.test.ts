import { describe, expect, it, vi } from "vitest"
import { handleEnterpriseImport } from "./importHttpAdapter"
import { ImportIdempotencyConflict } from "./importIdempotencyConflict"

const body = { idempotencyKey: "batch-a", items: [{ organizationId: "org-a", externalId: "case-a", sourceSystem: "erp", cnjNumber: "0000000-00.2026.8.26.0000" }] }
const context = { userId: "user-a", organizationId: "org-a", role: "legal" as const }
const now = new Date("2026-10-14T12:00:00Z")
const sha256 = async () => "sha256:" + "a".repeat(64)

describe("Enterprise import HTTP adapter", () => {
  it("rejects unauthenticated requests before persistence", async () => {
    const commit = vi.fn()
    const response = await handleEnterpriseImport(body, { authenticate: async () => null, sha256, persistence: { commit } }, now)
    expect(response.status).toBe(401)
    expect(commit).not.toHaveBeenCalled()
  })
  it("returns 201 after successful new import", async () => {
    const response = await handleEnterpriseImport(body, {
      authenticate: async () => ({ context }),
      sha256,
      persistence: { commit: async ({ receipt }) => ({ status: "created", receipt }) },
    }, now)
    expect(response.status).toBe(201)
  })
  it("returns 200 for idempotent replay", async () => {
    const response = await handleEnterpriseImport(body, {
      authenticate: async () => ({ context }),
      sha256,
      persistence: { commit: async ({ receipt }) => ({ status: "already_processed", receipt }) },
    }, now)
    expect(response.status).toBe(200)
  })
  it("returns 400 for invalid payload without persistence", async () => {
    const commit = vi.fn()
    const response = await handleEnterpriseImport({ ...body, items: [] }, {
      authenticate: async () => ({ context }), sha256, persistence: { commit },
    }, now)
    expect(response.status).toBe(400)
    expect(commit).not.toHaveBeenCalled()
  })
  it("returns 403 when role cannot import", async () => {
    const commit = vi.fn()
    const response = await handleEnterpriseImport(body, {
      authenticate: async () => ({ context: { ...context, role: "reader" } }), sha256, persistence: { commit },
    }, now)
    expect(response.status).toBe(403)
    expect(commit).not.toHaveBeenCalled()
  })
  it("returns 403 for cross-tenant request", async () => {
    const commit = vi.fn()
    const response = await handleEnterpriseImport({ ...body, items: [{ ...body.items[0], organizationId: "org-b" }] }, {
      authenticate: async () => ({ context }), sha256, persistence: { commit },
    }, now)
    expect(response.status).toBe(403)
    expect(commit).not.toHaveBeenCalled()
  })
  it("returns 400 for metadata not covered by fingerprint", async () => {
    const commit = vi.fn()
    const response = await handleEnterpriseImport({ ...body, items: [{ ...body.items[0], metadata: { tag: "sensitive" } }] }, {
      authenticate: async () => ({ context }), sha256, persistence: { commit },
    }, now)
    expect(response.status).toBe(400)
    expect(commit).not.toHaveBeenCalled()
  })
  it("returns 409 only for a typed idempotency conflict", async () => {
    const response = await handleEnterpriseImport(body, {
      authenticate: async () => ({ context }), sha256,
      persistence: { commit: async () => { throw new ImportIdempotencyConflict() } },
    }, now)
    expect(response.status).toBe(409)
    expect(response.body).toEqual({ error: { code: "IDEMPOTENCY_CONFLICT", message: "Chave de idempotência já utilizada com conteúdo diferente." } })
  })
  it("hides unexpected persistence errors", async () => {
    const response = await handleEnterpriseImport(body, {
      authenticate: async () => ({ context }),
      sha256,
      persistence: { commit: async () => { throw new Error("sensitive database details") } },
    }, now)
    expect(response.status).toBe(503)
    expect(JSON.stringify(response)).not.toContain("sensitive database details")
  })
})
