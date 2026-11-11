import {describe,expect,it,vi} from "vitest"
import {fetchUSPilotStatus} from "./usPilotStatusClient"

const url="https://abcdefghijklmnopqrst.supabase.co/functions/v1/usa-pilot-access"
const token="synthetic.jwt.token"
const response=(status:number,data:unknown)=>({status,json:async()=>data}) as Response
const ok={access:"ACTIVE_PILOT",role:"lawyer",legalSearchAvailable:false,predictiveModelAvailable:false}

describe("NexJud USA private pilot client refuses unverified capability claims",()=>{
  it("accepts exact read-only pilot response, no token persistence or redirects",async()=>{
    const fetchMock=vi.fn(async (_url:string,init?:RequestInit)=>{
      expect(_url).toBe(url)
      expect(init?.method).toBe("GET")
      expect(init?.redirect).toBe("error")
      expect(init?.cache).toBe("no-store")
      expect(init?.credentials).toBe("omit")
      expect(init?.headers).toMatchObject({Authorization:"Bearer "+token})
      return response(200,ok)
    })
    expect(await fetchUSPilotStatus(url,token,{fetchImpl:fetchMock as unknown as typeof fetch}))
      .toEqual({state:"ACTIVE_PILOT",role:"lawyer",legalSearchAvailable:false,predictiveModelAvailable:false})
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
  it("sends only publishable apikey next to a JWT, never a secret or bearer API key",async()=>{
    const publishableKey="sb_publishable_synthetic_pilot_key"
    const fetchMock=vi.fn(async (_url:string,init?:RequestInit)=>{
      expect(init?.headers).toMatchObject({
        Authorization:"Bearer "+token, apikey:publishableKey,
      })
      return response(200,ok)
    })
    expect(await fetchUSPilotStatus(url,token,{
      fetchImpl:fetchMock as unknown as typeof fetch,publishableKey,
    })).toEqual({state:"ACTIVE_PILOT",role:"lawyer",
      legalSearchAvailable:false,predictiveModelAvailable:false})
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const denied=vi.fn()
    for(const badKey of ["sb_secret_very_sensitive_server_only",
      "eyJlegacy-anon-jwt", "not-a-key", ""]) {
      expect(await fetchUSPilotStatus(url,token,{
        fetchImpl:denied, publishableKey:badKey,
      })).toEqual({state:"UNAVAILABLE"})
    }
    expect(denied).not.toHaveBeenCalled()
  })
  it("never calls network for untrusted endpoint, bad token or invalid timeout",async()=>{
    const call=vi.fn()
    for(const endpoint of [
      "https://abcdefghijklmnopqrst.supabase.co.evil.invalid/functions/v1/usa-pilot-access",
      "http://abcdefghijklmnopqrst.supabase.co/functions/v1/usa-pilot-access",
      "https://abcdefghijklmnopqrst.supabase.co/functions/v1/usa-courtlistener-search",
      "https://abcdefghijklmnopqrst.supabase.co/functions/v1/usa-pilot-access?token=secret",
      "https://user@abcdefghijklmnopqrst.supabase.co/functions/v1/usa-pilot-access",
      "https://abcdefghijklmnopqrst.supabase.co/functions/v1/usa-pilot-access#frag",
      "javascript:alert(1)",
    ]){
      expect(await fetchUSPilotStatus(endpoint,token,{fetchImpl:call})).toEqual({state:"UNAVAILABLE"})
    }
    for(const t of ["","token with whitespace","\nsecret", "x".repeat(8001)]){
      expect(await fetchUSPilotStatus(url,t,{fetchImpl:call})).toEqual({state:"UNAVAILABLE"})
    }
    expect(await fetchUSPilotStatus(url,token,{fetchImpl:call,timeoutMs:1})).toEqual({state:"UNAVAILABLE"})
    expect(call).not.toHaveBeenCalled()
  })
  it("returns unprivileged states for 401,403,503 and network error",async()=>{
    for(const [status,expected] of [[401,"UNAUTHENTICATED"],[403,"NOT_AUTHORIZED"],[503,"UNAVAILABLE"]] as const){
      expect(await fetchUSPilotStatus(url,token,{fetchImpl:vi.fn(async()=>response(status,{error:"no"})) as unknown as typeof fetch})).toEqual({state:expected})
    }
    expect(await fetchUSPilotStatus(url,token,{fetchImpl:vi.fn(async()=>{throw new Error("offline")}) as unknown as typeof fetch})).toEqual({state:"UNAVAILABLE"})
  })
  it("rejects backend claims that legal search or predictions are available",async()=>{
    for(const body of [
      {...ok,legalSearchAvailable:true},
      {...ok,predictiveModelAvailable:true},
      {...ok,role:"administrator"},
      {...ok,tenant_id:"private"},
      {...ok,access:"ACTIVE"},
      null,[], "success",
    ]){
      expect(await fetchUSPilotStatus(url,token,{fetchImpl:vi.fn(async()=>response(200,body)) as unknown as typeof fetch})).toEqual({state:"UNAVAILABLE"})
    }
  })
})
