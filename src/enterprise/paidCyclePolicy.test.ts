import { describe, expect, it } from "vitest"
import { evaluatePaidCycle } from "../../supabase/functions/_shared/paidCyclePolicy"
const paid = {verified:true,contractMatched:true,event:"PIX_AUTOMATIC_COBR_COMPLETED",status:"COMPLETED",expectedCents:19700,paidCents:19700,cycleStart:"2026-11-01T00:00:00.000Z",cycleEnd:"2026-12-01T00:00:00.000Z",paidUntil:null as string|null}
describe("NexJud monthly paid entitlement policy", () => {
  it("extends only after verified payment", () => expect(evaluatePaidCycle(paid).extendUntil).toBe("2026-12-01T00:00:00.000Z"))
  it("does not activate on bank authorization", () => expect(evaluatePaidCycle({...paid,event:"PIX_AUTOMATIC_APPROVED"}).extendUntil).toBeNull())
  it("requires signed, mapped provider event", () => {
    expect(evaluatePaidCycle({...paid,verified:false}).extendUntil).toBeNull()
    expect(evaluatePaidCycle({...paid,contractMatched:false}).extendUntil).toBeNull()
  })
  it("rejects wrong amount and failed payment", () => {
    expect(evaluatePaidCycle({...paid,paidCents:39700}).extendUntil).toBeNull()
    expect(evaluatePaidCycle({...paid,status:"PENDING"}).extendUntil).toBeNull()
  })
  it("never shortens paid access for duplicate or late notifications", () => {
    expect(evaluatePaidCycle({...paid,paidUntil:"2027-01-01T00:00:00.000Z"}).extendUntil).toBeNull()
  })
})
