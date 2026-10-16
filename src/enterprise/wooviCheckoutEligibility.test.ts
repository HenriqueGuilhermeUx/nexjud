import { describe, expect, it } from "vitest"
import { checkoutEligibilityBlockReason } from "../../supabase/functions/_shared/wooviCheckoutEligibility"

const now = Date.parse("2026-10-16T12:00:00Z")
describe("NexJud Woovi checkout guard before issuing a Pix charge", () => {
  it("does not charge existing paid legacy clients with unknown end dates", () => {
    for (const requested of ["pro", "intelligence", "enterprise", "enterprise_plus"]) {
      const result = checkoutEligibilityBlockReason({
        plan: "enterprise_plus", status: "active", active: true, current_period_end: null,
      }, requested, now)
      expect(result).toMatch(/Nenhum Pix foi gerado/)
    }
  })
  it("blocks active paid downgrades even with a known future expiry", () => {
    expect(checkoutEligibilityBlockReason({
      plan: "enterprise", status: "active", active: true,
      current_period_end: "2026-11-16T12:00:00Z",
    }, "pro", now)).toMatch(/plano superior ativo/)
  })
  it("allows trial upgrades, first purchases, active renewals and allowed upgrades", () => {
    expect(checkoutEligibilityBlockReason(null, "pro", now)).toBeNull()
    expect(checkoutEligibilityBlockReason({ plan: "trial", active: true, status: "active", current_period_end: null }, "pro", now)).toBeNull()
    expect(checkoutEligibilityBlockReason({ plan: "pro", active: true, status: "active", current_period_end: "2026-11-01T00:00:00Z" }, "pro", now)).toBeNull()
    expect(checkoutEligibilityBlockReason({ plan: "pro", active: true, status: "active", current_period_end: "2026-11-01T00:00:00Z" }, "enterprise", now)).toBeNull()
    expect(checkoutEligibilityBlockReason({ plan: "enterprise", active: true, status: "active", current_period_end: "2026-09-01T00:00:00Z" }, "pro", now)).toBeNull()
  })
  it("fails closed for ambiguous active subscriptions or corrupt period dates", () => {
    expect(checkoutEligibilityBlockReason({ plan: "other-paid", active: true, status: "active" }, "pro", now)).toMatch(/Nenhuma cobrança foi gerada/)
    expect(checkoutEligibilityBlockReason({ plan: "enterprise", active: true, status: "active", current_period_end: "invalid" }, "pro", now)).toMatch(/Nenhuma cobrança foi gerada/)
    expect(checkoutEligibilityBlockReason(null, "trial", now)).toBeNull()
    expect(checkoutEligibilityBlockReason({ plan: "pro", active: true, status: "active", current_period_end: "2026-12-01T00:00:00Z" }, "unknown", now)).toMatch(/inválido/)
  })
})
