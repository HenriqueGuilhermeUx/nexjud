import {describe,it,expect} from "vitest"
import {buildMonthlyPixAutomaticRequest} from "../../supabase/functions/_shared/monthlyPixContract"
const customer={name:"Cliente Teste",email:"teste@example.test",taxID:"12345678901",phone:"5513999999999",address:{zipcode:"11010000",street:"Rua Exemplo",number:"100",neighborhood:"Centro",city:"Santos",state:"SP"}}
const fn=(plan:"pro"|"enterprise"="pro",start="2026-10-22T12:00:00.000Z")=>buildMonthlyPixAutomaticRequest(plan,customer,"order-monthly-test-1",start,"2026-10-15T12:00:00.000Z")
describe("Woovi Pix Automatic contract proposal",()=>{
  it("builds correct monthly future-only mandate without granting access",()=>{
    const p=fn()
    expect([p.type,p.frequency,p.pixRecurringOptions.journey,p.value]).toEqual(["PIX_RECURRING","MONTHLY","ONLY_RECURRENCY",19700])
    expect(p).not.toHaveProperty("active")
  })
  it("uses server-owned plan catalog",()=>expect(fn("enterprise").value).toBe(79700))
  it("blocks early charge and incomplete address",()=>{
    expect(()=>fn("pro","2026-10-16T12:00:00.000Z")).toThrow()
    expect(()=>buildMonthlyPixAutomaticRequest("pro",{...customer,address:{...customer.address,zipcode:""}},"order-monthly-test-1","2026-10-22T12:00:00.000Z","2026-10-15T12:00:00.000Z")).toThrow()
  })
})
