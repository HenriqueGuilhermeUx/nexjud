import { describe, expect, it, vi } from "vitest"
import { commitEnterpriseImport } from "./importCommitService"
import type { TenantContext } from "./tenantScope"

const context: TenantContext = { userId: "user-a", organizationId: "org-a", role: "legal" }
const request = {
  idempotencyKey: "batch-a",
  items: [{ organizationId: "org-a", externalId: "case-a", sourceSystem: "erp", cnjNumber: "0000000-00.2026.8.26.0000" }],
}
const now = new Date("2026-10-14T12:00:00Z")

describe("Enterprise import commit service", () => {
  it("passes consistent metadata to the transaction adapter", async () => {
    const commit = vi.fn(async (input: Parameters<NonNullable<Parameters<typeof commitEnterpriseImport>[3]["persistence"]["commit"]>>[0]) => ({ status: "created" as const, receipt: input.receipt }))
    const result = await commitEnterpriseImport(context, request, now, {
      sha256: async () => "sha256:" + "a".repeat(64),
      persistence: { commit },
    })
    expect(result.status).toBe("created")
    expect(commit).toHaveBeenCalledTimes(1)
  })
  it("blocks unauthorized tenant before hashing or persistence", async () => {
    const sha256 = vi.fn(async () => "sha256:" + "a".repeat(64))
    const commit = vi.fn()
    await expect(commitEnterpriseImport(context, { ...request, items: [{ ...request.items[0], organizationId: "org-b" }] }, now, {
      sha256,
      persistence: { commit },
    })).rejects.toThrow()
    expect(sha256).not.toHaveBeenCalled()
    expect(commit).not.toHaveBeenCalled()
  })
  it("rejects malformed digest before persistence", async () => {
    const commit = vi.fn()
    await expect(commitEnterpriseImport(context, request, now, {
      sha256: async () => "bad",
      persistence: { commit },
    })).rejects.toThrow()
    expect(commit).not.toHaveBeenCalled()
  })
})
