import { describe,expect,it } from "vitest"
import { isUSBackendConfigurationApproved,type USBackendSettings } from "./sharedBackendConfig"
const valid:USBackendSettings={
  mode:"shared_nexjud_partition",
  url:"https://abcdefghijklmnopqrst.supabase.co",
  expectedProjectRef:"abcdefghijklmnopqrst",
  publishableKey:"sb_publishable_synthetic_for_offline_test",
  sharedPartitionReviewed:"true",
  sharedScopeApproved:"true",
}
describe("USA shared Supabase backend enable gate — no real credentials",()=>{
  it("accepts only explicit reviewed exact-ref shared partition",()=>{
    expect(isUSBackendConfigurationApproved(valid)).toBe(true)
    expect(isUSBackendConfigurationApproved({...valid,url:valid.url+"/"})).toBe(true)
  })
  it("fails closed for no approval, unknown mode and wrong ref",()=>{
    for(const patch of [
      {sharedPartitionReviewed:"false"}, {sharedScopeApproved:"false"},
      {sharedPartitionReviewed:""},{sharedScopeApproved:""},
      {mode:"shared"}, {mode:""}, {expectedProjectRef:"br-project"},
      {url:"https://otherproject1234567.supabase.co"},
      {url:"https://abcdefghijklmnopqrst.supabase.co.evil.example"},
      {url:"http://abcdefghijklmnopqrst.supabase.co"},
      {url:"https://abcdefghijklmnopqrst.supabase.co/auth/v1"},
      {url:"https://abcdefghijklmnopqrst.supabase.co?token=abc"},
      {url:"https://user@abcdefghijklmnopqrst.supabase.co"},
      {publishableKey:"sb_secret_fake-secret"},
      {publishableKey:"eyJsynthetic.legacy.jwt"},
    ]){
      expect(isUSBackendConfigurationApproved({...valid,...patch})).toBe(false)
    }
  })
  it("does not accept a relabeled dedicated mode with shared approvals",()=>{
    expect(isUSBackendConfigurationApproved({...valid,mode:"dedicated_us_project"})).toBe(false)
    expect(isUSBackendConfigurationApproved({...valid,mode:"dedicated_us_project",
      sharedPartitionReviewed:"false",sharedScopeApproved:"false"})).toBe(true)
  })
})
