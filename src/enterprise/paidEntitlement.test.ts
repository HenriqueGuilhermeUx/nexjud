import { describe, expect, it } from "vitest"
import { paidEntitlementCurrent } from "../services/paidEntitlement"

const now = Date.parse("2026-10-15T18:00:00Z")
describe("NexJud monthly access expires without affecting legacy customers", () => {
  it("accepts a valid confirmed paid period", () => {
    expect(paidEntitlementCurrent({active:true,status:"active",current_period_end:"2026-11-15T18:00:00Z"},now)).toBe(true)
  })
  it("rejects expired periods exactly at or before expiration", () => {
    for (const end of ["2026-10-15T18:00:00Z", "2026-10-14T18:00:00Z"])
      expect(paidEntitlementCurrent({active:true,status:"active",current_period_end:end},now)).toBe(false)
  })
  it("does not allow inactive, non-active or invalid expiry", () => {
    expect(paidEntitlementCurrent({active:false,status:"active"},now)).toBe(false)
    expect(paidEntitlementCurrent({active:true,status:"past_due"},now)).toBe(false)
    expect(paidEntitlementCurrent({active:true,status:"active",current_period_end:"invalid-date"},now)).toBe(false)
  })
  it("preserves the previous entitlement for existing paid records without an end date", () => {
    expect(paidEntitlementCurrent({active:true,status:"active",current_period_end:null},now)).toBe(true)
    expect(paidEntitlementCurrent({active:true,status:"active"},now)).toBe(true)
  })
})
