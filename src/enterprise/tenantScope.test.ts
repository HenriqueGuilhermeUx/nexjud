import { describe, expect, it } from "vitest"
import { assertTenantScope, filterTenantScope } from "./tenantScope"

const context = { organizationId: "org-a", userId: "user-a", role: "legal" as const }

describe("Enterprise tenant scope", () => {
  it("accepts resources from current tenant", () => {
    expect(() => assertTenantScope(context, { organizationId: "org-a" })).not.toThrow()
  })
  it("rejects cross-tenant resources", () => {
    expect(() => assertTenantScope(context, { organizationId: "org-b" })).toThrow()
  })
  it("rejects missing identity", () => {
    expect(() => assertTenantScope({ ...context, userId: "" }, { organizationId: "org-a" })).toThrow()
  })
  it("filters cross-tenant resources", () => {
    expect(filterTenantScope(context, [{ organizationId: "org-a" }, { organizationId: "org-b" }])).toEqual([{ organizationId: "org-a" }])
  })
  it("returns no resources for invalid context", () => {
    expect(filterTenantScope({ ...context, organizationId: "" }, [{ organizationId: "org-a" }])).toEqual([])
  })
})
