import {describe,expect,it,vi} from "vitest"
import type {SupabaseClient} from "@supabase/supabase-js"
import type {USPilotStatus} from "./usPilotStatusClient"
import {createUSPrivatePilotSession, validUSPrivatePilotConfig} from "./usPrivatePilotSession"

const config={
  enabled:true,
  supabaseUrl:"https://abcdefghijklmnopqrst.supabase.co",
  publishableKey:"sb_publishable_synthetic_pilot_test_only",
  expectedProjectRef:"abcdefghijklmnopqrst",
  allowedOrigin:"https://pilot.nexjud-usa.example",
  currentOrigin:"https://pilot.nexjud-usa.example",
}
const good={state:"ACTIVE_PILOT",role:"lawyer",legalSearchAvailable:false,predictiveModelAvailable:false} as const
function setup(lookupResult:USPilotStatus=good){
  const auth={
    signInWithPassword:vi.fn(async ()=>({data:{session:{access_token:"synthetic.short.lived.jwt"}},error:null})),
    signOut:vi.fn(async()=>({error:null})),
  }
  const clientFactory=vi.fn((_url:string,_key:string,_opts:object)=>({auth}) as unknown as Pick<SupabaseClient,"auth">)
  const statusLookup=vi.fn(async()=>lookupResult)
  return {auth,clientFactory,statusLookup}
}
describe("NexJud USA private pilot authentication — never Brazilian app session",()=>{
  it("rejects unreviewed configs, insecure endpoints, mismatched origins and secret keys",()=>{
    const variants=[
      {enabled:false},{supabaseUrl:"http://abcdefghijklmnopqrst.supabase.co"},
      {supabaseUrl:"https://attacker.supabase.co"},
      {supabaseUrl:"https://abcdefghijklmnopqrst.supabase.co.evil.invalid"},
      {supabaseUrl:"https://abcdefghijklmnopqrst.supabase.co/auth/v1"},
      {supabaseUrl:"https://abcdefghijklmnopqrst.supabase.co?token=secret"},
      {publishableKey:"sb_secret_not_for_browsers"},
      {expectedProjectRef:"otherproject123456789"},
      {allowedOrigin:"https://pilot.nexjud-usa.example/other"},
      {currentOrigin:"https://forged.nexjud-usa.example"},
      {allowedOrigin:"https://nexjudsolucoes.com.br",currentOrigin:"https://nexjudsolucoes.com.br"},
    ]
    for(const invalid of variants){
      expect(validUSPrivatePilotConfig({...config,...invalid})).toBe(false)
      const deps=setup()
      const session=createUSPrivatePilotSession({...config,...invalid},deps)
      expect(deps.clientFactory).not.toHaveBeenCalled()
      expect(deps.statusLookup).not.toHaveBeenCalled()
      expect(session.getState()).toEqual({state:"NOT_ENABLED"})
    }
  })
  it("uses no persistent sessions, redirects, signup or Brazil wrappers",async()=>{
    const deps=setup()
    const c=createUSPrivatePilotSession(config,deps)
    const result=await c.login("authorized@example.com","correct-passphrase")
    expect(result).toEqual({state:"ACTIVE_PILOT",role:"lawyer"})
    expect(deps.clientFactory).toHaveBeenCalledTimes(1)
    expect(deps.clientFactory).toHaveBeenCalledWith(
      config.supabaseUrl,config.publishableKey,{
        auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
      },
    )
    expect(deps.auth.signInWithPassword).toHaveBeenCalledWith({
      email:"authorized@example.com",password:"correct-passphrase",
    })
    expect(deps.statusLookup).toHaveBeenCalledWith(
      config.supabaseUrl+"/functions/v1/usa-pilot-access","synthetic.short.lived.jwt",
      {publishableKey:config.publishableKey},
    )
    expect(deps.auth.signOut).not.toHaveBeenCalled()
    await c.logout()
    expect(deps.auth.signOut).toHaveBeenCalledOnce()
    expect(c.getState()).toEqual({state:"NOT_ENABLED"})
  })
  it("denies credentials without network when syntax invalid",async()=>{
    const deps=setup()
    const c=createUSPrivatePilotSession(config,deps)
    expect(await c.login("notanemail","password123")).toEqual({state:"INVALID_CREDENTIALS"})
    expect(await c.login("valid@example.com","short")).toEqual({state:"INVALID_CREDENTIALS"})
    expect(deps.auth.signInWithPassword).not.toHaveBeenCalled()
    expect(deps.statusLookup).not.toHaveBeenCalled()
  })
  it("logs out on missing US membership, suspended tenant, or unavailable backend",async()=>{
    for(const state of ["NOT_AUTHORIZED","UNAVAILABLE","UNAUTHENTICATED"] as const){
      const deps=setup({state})
      const c=createUSPrivatePilotSession(config,deps)
      const expected=state==="UNAUTHENTICATED"?"INVALID_CREDENTIALS":state
      expect(await c.login("no-us-role@example.com","correct-passphrase")).toEqual({state:expected})
      expect(deps.auth.signOut).toHaveBeenCalledOnce()
      expect(c.getState()).toEqual({state:expected})
    }
  })
  it("fails closed on invalid Auth return and unexpected network errors",async()=>{
    const deps=setup()
    deps.auth.signInWithPassword.mockResolvedValueOnce({data:{session:null},error:null} as never)
    const c=createUSPrivatePilotSession(config,deps)
    expect(await c.login("x@example.com","correct-passphrase")).toEqual({state:"INVALID_CREDENTIALS"})
    expect(deps.statusLookup).not.toHaveBeenCalled()
    expect(deps.auth.signOut).toHaveBeenCalledOnce()
  })
  it("refuses overlapping sign-in attempts and does not grant access after logout",async()=>{
    let resume!: (value:unknown)=>void
    const pending=new Promise(resolve=>{resume=resolve})
    const deps=setup()
    deps.auth.signInWithPassword.mockImplementationOnce(async()=>await pending as never)
    const c=createUSPrivatePilotSession(config,deps)
    const first=c.login("x@example.com","correct-passphrase")
    expect(await c.login("x@example.com","correct-passphrase")).toEqual({state:"BUSY"})
    await c.logout()
    resume({data:{session:{access_token:"synthetic.token"}},error:null})
    expect(await first).toEqual({state:"UNAVAILABLE"})
    expect(deps.statusLookup).not.toHaveBeenCalled()
  })
})
