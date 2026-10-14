import { describe, expect, it } from "vitest"
import { planAuthorizedEnterpriseImport } from "./importAuthorization"
import type { TenantContext } from "./tenantScope"

const context: TenantContext = { userId: "user-a", organizationId: "org-a", role: "legal" }
const item = { organizationId: "org-a", externalId: "case-a", sourceSystem: "erp", cnjNumber: "0000000-00.2026.8.26.0000" }
const request = { idempotencyKey: "batch-a", items: [item] }

describe("Authorized enterprise import", () => {
  it("permits authorized legal staff", () => {
    expect(planAuthorizedEnterpriseImport(context, request).organizationId).toBe("org-a")
  })
  it("rejects cross-tenant items", () => {
    expect(() => planAuthorizedEnterpriseImport(context, { ...request, items: [{ ...item, organizationId: "org-b" }] })).toThrow()
  })
  it("rejects mixed-tenant batches", () => {
    expect(() => planAuthorizedEnterpriseImport(context, { ...request, items: [item, { ...item, externalId: "case-b", organizationId: "org-b" }] })).toThrow()
  })
  it("rejects read-only role", () => {
    expect(() => planAuthorizedEnterpriseImport({ ...context, role: "reader" }, request)).toThrow()
  })
  it("rejects missing user identity", () => {
    expect(() => planAuthorizedEnterpriseImport({ ...context, userId: "" }, request)).toThrow()
  })
})
