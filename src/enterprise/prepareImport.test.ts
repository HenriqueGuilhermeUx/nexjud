import { describe, expect, it } from "vitest"
import { prepareEnterpriseImport } from "./prepareImport"
import type { TenantContext } from "./tenantScope"

const actor: TenantContext = { userId: "user-a", organizationId: "org-a", role: "legal" }
const request = {
  idempotencyKey: "batch-a",
  items: [{ organizationId: "org-a", externalId: "case-a", sourceSystem: "erp", cnjNumber: "0000000-00.2026.8.26.0000" }],
}

describe("prepare enterprise import", () => {
  it("returns consistent plan audit and receipt", () => {
    const result = prepareEnterpriseImport(actor, request, new Date("2026-10-14T12:00:00Z"))
    expect(result.plan.organizationId).toBe(result.audit.organizationId)
    expect(result.receipt.itemCount).toBe(result.plan.uniqueCases.length)
    expect(result.receipt.actorId).toBe("user-a")
  })
  it("blocks cross-tenant data before audit", () => {
    expect(() => prepareEnterpriseImport(actor, { ...request, items: [{ ...request.items[0], organizationId: "org-b" }] }, new Date())).toThrow()
  })
  it("blocks read-only users", () => {
    expect(() => prepareEnterpriseImport({ ...actor, role: "reader" }, request, new Date())).toThrow()
  })
})
