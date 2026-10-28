import { describe, expect, it } from "vitest"
import { verifiedUSPrincipalFromMembership } from "./usPrincipalMapping.ts"
import { runUSOpinionSearch, USLegalSearchDenied, type VerifiedUSPrincipal } from "./usOpinionSearchGate.ts"

const user="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1"
const tenant="11111111-1111-4111-8111-111111111111"

describe("NexJud USA member role mapping under RLS",()=>{
  it.each([
    ["owner","firm_admin"],
    ["attorney","lawyer"],
    ["researcher","researcher"],
    ["viewer","other"],
  ] as const)("maps DB %s to gated %s", (role,expected)=>{
    expect(verifiedUSPrincipalFromMembership(user,[{tenant_id:tenant,role}])).toEqual({
      userId:user,tenantId:tenant,role:expected
    })
  })

  it("rejects missing, duplicate and malformed active memberships",()=>{
    for (const rows of [
      [],[{tenant_id:tenant,role:"attorney"},{tenant_id:tenant,role:"attorney"}],
      [{tenant_id:tenant,role:"admin"}],
      [{tenant_id:tenant,role:"lawyer"}],
      [{tenant_id:tenant,role:null}],
      [{tenant_id:"Brazil",role:"owner"}],
      [{tenant_id:"",role:"owner"}],
      [{tenant_id:tenant,role:"owner"},{}],
      null,{},[null],["attorney"],
    ]){
      expect(verifiedUSPrincipalFromMembership(user,rows)).toBeNull()
    }
    expect(verifiedUSPrincipalFromMembership("anonymous",[{tenant_id:tenant,role:"owner"}])).toBeNull()
    expect(verifiedUSPrincipalFromMembership(null,[{tenant_id:tenant,role:"owner"}])).toBeNull()
  })

  it("viewer never consumes quota or calls CourtListener",async()=>{
    const principal=verifiedUSPrincipalFromMembership(user,[{tenant_id:tenant,role:"viewer"}])
    let entitlementCount=0,quotaCount=0,providerCount=0
    await expect(runUSOpinionSearch({query:"contract disputes",providerDisclosureAccepted:true},{
      enabled:true, commercialUseAuthorized:true,
      principal:async()=>principal,
      entitled:async()=>{entitlementCount++;return true},
      consumeQuota:async()=>{quotaCount++;return true},
      fetchOpinions:async()=>{providerCount++;return []},
      collectedAt:()=>new Date("2026-10-28T00:00:00Z").toISOString(),
    })).rejects.toMatchObject({name:"USLegalSearchDenied",code:"FORBIDDEN"})
    expect([entitlementCount,quotaCount,providerCount]).toEqual([0,0,0])
  })

  it("attorney is accepted by policy when enabled, entitled and budgeted",async()=>{
    const principal=verifiedUSPrincipalFromMembership(user,[{tenant_id:tenant,role:"attorney"}])
    const result=await runUSOpinionSearch({query:"contract disputes",providerDisclosureAccepted:true},{
      enabled:true,commercialUseAuthorized:true,principal:async()=>principal,
      entitled:async()=>true,consumeQuota:async()=>true,
      fetchOpinions:async()=>[],collectedAt:()=>new Date("2026-10-28T00:00:00Z").toISOString(),
    })
    expect(result.records).toEqual([])
    expect(result.predictiveModelAvailable).toBe(false)
  })
})
