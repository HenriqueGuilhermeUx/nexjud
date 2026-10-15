import { describe, expect, it } from "vitest"
import { canPerformEnterpriseAction, requireEnterprisePermission } from "./authorization"
import type { TenantContext } from "./tenantScope"

const base: TenantContext = { userId: "user-1", organizationId: "org-a", role: "legal" }
const own = { organizationId: "org-a" }
const other = { organizationId: "org-b" }

describe("Enterprise permissions", () => {
  it("allows legal staff to import for own tenant", () => {
    expect(canPerformEnterpriseAction(base, own, "case:import")).toBe(true)
  })
  it("rejects cross-tenant access even for owner", () => {
    expect(canPerformEnterpriseAction({ ...base, role: "owner" }, other, "member:manage")).toBe(false)
  })
  it("limits readers to read-only", () => {
    expect(canPerformEnterpriseAction({ ...base, role: "reader" }, own, "case:read")).toBe(true)
    expect(canPerformEnterpriseAction({ ...base, role: "reader" }, own, "case:write")).toBe(false)
  })
  it("reserves reviews for reviewer or owner", () => {
    expect(canPerformEnterpriseAction(base, own, "case:review")).toBe(false)
    expect(canPerformEnterpriseAction({ ...base, role: "reviewer" }, own, "case:review")).toBe(true)
  })
  it("rejects missing identity", () => {
    expect(canPerformEnterpriseAction({ ...base, userId: "" }, own, "case:read")).toBe(false)
  })
  it("throws on forbidden operation", () => {
    expect(() => requireEnterprisePermission(base, own, "member:manage")).toThrow()
  })
})
