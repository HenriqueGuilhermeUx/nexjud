import { describe, expect, it } from "vitest"
import { paidEntitlementCurrent } from "../services/paidEntitlement"

const now = Date.parse("2026-10-15T18:00:00Z")
describe("NexJud monthly access expires without affecting legacy paid customers", () => {
  it("accepts valid confirmed paid periods for recognized paid plans", () => {
    for (const plan of ["pro", "intelligence", "enterprise", "enterprise_plus"]) {
      expect(paidEntitlementCurrent({plan, active: true, status: "active", current_period_end: "2026-11-15T18:00:00Z"}, now)).toBe(true)
    }
  })
  it("rejects expired periods exactly at or before expiration", () => {
    for (const end of ["2026-10-15T18:00:00Z", "2026-10-14T18:00:00Z"])
      expect(paidEntitlementCurrent({plan:"pro", active:true, status:"active", current_period_end:end}, now)).toBe(false)
  })
  it("does not allow inactive, non-active, unknown plan or invalid expiry", () => {
    expect(paidEntitlementCurrent({plan:"pro", active:false, status:"active"}, now)).toBe(false)
    expect(paidEntitlementCurrent({plan:"pro", active:true, status:"past_due"}, now)).toBe(false)
    expect(paidEntitlementCurrent({plan:"pro", active:true, status:"active",current_period_end:"invalid-date"}, now)).toBe(false)
    expect(paidEntitlementCurrent({active:true, status:"active",current_period_end:null}, now)).toBe(false)
    expect(paidEntitlementCurrent({plan:"not_a_plan", active:true, status:"active",current_period_end:null}, now)).toBe(false)
  })
  it("rejects active trials with no paid expiry, including historical status=active trials", () => {
    expect(paidEntitlementCurrent({plan:"trial", active:true, status:"active", current_period_end:null}, now)).toBe(false)
    expect(paidEntitlementCurrent({plan:"trial", active:true, status:"trialing", current_period_end:null}, now)).toBe(false)
    expect(paidEntitlementCurrent({plan:"trial", active:true, status:"active", current_period_end:"2026-11-15T18:00:00Z"}, now)).toBe(false)
  })
  it("preserves existing paid tiers without an end date until deliberate reconciliation", () => {
    for (const plan of ["pro", "intelligence", "enterprise", "enterprise_plus"]) {
      expect(paidEntitlementCurrent({plan, active:true, status:"active",current_period_end:null}, now)).toBe(true)
      expect(paidEntitlementCurrent({plan, active:true, status:"active"}, now)).toBe(true)
    }
  })
})
