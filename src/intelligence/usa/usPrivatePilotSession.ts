/**
 * NexJud USA pilot login — isolated, UNDEPLOYED.
 *
 * This does not reuse src/lib/supabase.ts (Brazil), its global session,
 * Brazilian profiles or any subscription/analytics tables.
 * Auth client MUST be created with persistSession:false and
 * detectSessionInUrl:false. No localStorage, cookies or URL credentials.
 * Real authorization is always rechecked by the USA server; the browser's
 * flags, user metadata and session alone NEVER grant a US tenant role.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { fetchUSPilotStatus, type USPilotStatus } from "./usPilotStatusClient"

export interface USPrivatePilotConfig {
  enabled: boolean
  supabaseUrl: string
  publishableKey: string
  expectedProjectRef: string
  allowedOrigin: string
  currentOrigin: string
}
export type USPrivatePilotResult =
  | { state:"NOT_ENABLED"|"INVALID_CREDENTIALS"|"NOT_AUTHORIZED"|"UNAVAILABLE"|"BUSY" }
  | { state:"ACTIVE_PILOT"; role:"firm_admin"|"lawyer"|"researcher"|"other" }

export function validUSPrivatePilotConfig(s: USPrivatePilotConfig): boolean {
  if (!s || s.enabled !== true || !/^[a-z0-9]{20}$/.test(s.expectedProjectRef) ||
      !/^sb_publishable_[a-zA-Z0-9_-]{12,}$/.test(s.publishableKey)) return false
  try {
    const api = new URL(s.supabaseUrl)
    const origin = new URL(s.allowedOrigin)
    return api.protocol === "https:" &&
      api.hostname === s.expectedProjectRef+".supabase.co" &&
      api.pathname === "/" && !api.port && !api.search && !api.hash &&
      !api.username && !api.password &&
      origin.protocol === "https:" && !origin.port &&
      origin.origin === s.allowedOrigin &&
      origin.origin === s.currentOrigin &&
      origin.pathname === "/" && !origin.search && !origin.hash &&
      !origin.username && !origin.password &&
      // Never ship this U.S.-specific build on Brazil's production domain.
      !["nexjudsolucoes.com.br","www.nexjudsolucoes.com.br"].includes(origin.hostname)
  } catch { return false }
}

type USAuthClient = Pick<SupabaseClient,"auth">
type ClientFactory = (url:string,key:string,options:Parameters<typeof createClient>[2])=>USAuthClient
type StatusLookup = typeof fetchUSPilotStatus

export function createUSPrivatePilotSession(
  config: USPrivatePilotConfig,
  dependencies: {clientFactory?:ClientFactory; statusLookup?:StatusLookup} = {},
) {
  const enabled = validUSPrivatePilotConfig(config)
  const makeClient = dependencies.clientFactory ?? createClient
  const statusLookup = dependencies.statusLookup ?? fetchUSPilotStatus
  // No client exists and no requests are possible unless explicitly enabled.
  const client = enabled ? makeClient(config.supabaseUrl,config.publishableKey,{
    auth:{
      persistSession:false,
      autoRefreshToken:false,
      detectSessionInUrl:false,
    },
  }) : null
  let working = false
  let generation = 0
  let status:USPrivatePilotResult = {state:"NOT_ENABLED"}
  const safeLogout = async () => {
    try { if(client) await client.auth.signOut() } catch { /* fail closed */ }
  }
  return {
    getState: ():USPrivatePilotResult => status,
    async login(email:string,password:string):Promise<USPrivatePilotResult> {
      if(!enabled || !client) return {state:"NOT_ENABLED"}
      if(working) return {state:"BUSY"}
      if(typeof email!=="string" || email.length<3 || email.length>254 ||
         !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
         typeof password!=="string" || password.length<8 || password.length>256)
        return {state:"INVALID_CREDENTIALS"}
      working=true
      const ownGeneration=++generation
      status={state:"UNAVAILABLE"}
      try {
        const result=await client.auth.signInWithPassword({email:email.trim(),password})
        if(ownGeneration!==generation) {
          await safeLogout()
          return {state:"UNAVAILABLE"}
        }
        if(result.error || !result.data?.session?.access_token) {
          await safeLogout()
          status={state:"INVALID_CREDENTIALS"}
          return status
        }
        // The server validates JWT, live membership/RLS and US tenant status.
        const us=await statusLookup(
          config.supabaseUrl+"/functions/v1/usa-pilot-access",
          result.data.session.access_token,
        )
        if(ownGeneration!==generation) {
          await safeLogout()
          return {state:"UNAVAILABLE"}
        }
        if(us.state!=="ACTIVE_PILOT") {
          await safeLogout()
          status={
            state:us.state==="UNAUTHENTICATED"?"INVALID_CREDENTIALS":
                  us.state==="NOT_AUTHORIZED"?"NOT_AUTHORIZED":"UNAVAILABLE"
          }
          return status
        }
        // No research/predictive capability is unlocked by UI login.
        status={state:"ACTIVE_PILOT",role:us.role}
        return status
      } catch {
        await safeLogout()
        status={state:"UNAVAILABLE"}
        return status
      } finally {
        working=false
      }
    },
    async logout():Promise<void> {
      generation++
      status={state:"NOT_ENABLED"}
      await safeLogout()
    },
  }
}
