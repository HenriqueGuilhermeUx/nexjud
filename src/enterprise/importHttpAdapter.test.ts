import { describe, expect, it, vi } from "vitest"
import { handleEnterpriseImport } from "./importHttpAdapter"

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
