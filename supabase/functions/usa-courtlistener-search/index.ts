/**
 * NexJud USA / CourtListener v4 (ISOLATED DRAFT ONLY).
 *
 * Not deployed. Defaults OFF. Default architecture is a dedicated US project.
 * A shared NexJud Supabase project is allowed ONLY after independent
 * tenant/RLS/quota/isolation approval and strict server-owned backend flags.
 * This does not authorize changing the current Brazilian production schema.
 *
 * Environment (server secrets / no VITE_ prefix):
 * USA_COURTLISTENER_ENABLED, USA_COURTLISTENER_COMMERCIAL_APPROVED,
 * USA_COURTLISTENER_TOKEN, USA_SUPABASE_URL, USA_SUPABASE_PUBLISHABLE_KEY,
 * USA_ALLOWED_WEB_ORIGIN,
 * USA_BACKEND_MODE, USA_EXPECTED_SUPABASE_PROJECT_REF,
 * USA_SHARED_PARTITION_REVIEWED, USA_SHARED_SCOPE_APPROVED
 */
import { createClient } from "jsr:@supabase/supabase-js@2"
import { runUSOpinionSearch, USLegalSearchDenied, type VerifiedUSPrincipal } from "../../../src/intelligence/usa/usOpinionSearchGate.ts"
import { isUSBackendConfigurationApproved } from "../../../src/intelligence/usa/sharedBackendConfig.ts"
import { searchCourtListenerOpinions } from "../_shared/usa/courtListenerClient.ts"

const env = (name: string) => Deno.env.get(name) || ""
const originAllowed = (origin: string | null): boolean =>
  Boolean(origin && /^https:\/\//.test(origin) && origin === env("USA_ALLOWED_WEB_ORIGIN"))

function response(payload: unknown, status: number, origin: string | null): Response {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  })
  if (origin && originAllowed(origin)) {
    headers.set("Access-Control-Allow-Origin", origin)
    headers.set("Access-Control-Allow-Headers", "authorization, apikey, content-type, x-client-info")
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS")
  }
  return new Response(JSON.stringify(payload), { status, headers })
}

Deno.serve(async req => {
  const origin = req.headers.get("origin")
  if (!originAllowed(origin)) return response({ error: "FORBIDDEN_ORIGIN" }, 403, null)
  if (req.method === "OPTIONS") return response({ ok: true }, 200, origin)
  if (req.method !== "POST") return response({ error: "METHOD_NOT_ALLOWED" }, 405, origin)

  // The entire feature is unavailable until contracts, US RLS and quotas are approved.
  const enabled = env("USA_COURTLISTENER_ENABLED") === "true"
  const commercialUseAuthorized = env("USA_COURTLISTENER_COMMERCIAL_APPROVED") === "true"
  const usUrl = env("USA_SUPABASE_URL")
  const usKey = env("USA_SUPABASE_PUBLISHABLE_KEY")
  const providerToken = env("USA_COURTLISTENER_TOKEN")
  const backendApproved = isUSBackendConfigurationApproved({
    mode: env("USA_BACKEND_MODE"),
    url: usUrl,
    publishableKey: usKey,
    expectedProjectRef: env("USA_EXPECTED_SUPABASE_PROJECT_REF"),
    sharedPartitionReviewed: env("USA_SHARED_PARTITION_REVIEWED"),
    sharedScopeApproved: env("USA_SHARED_SCOPE_APPROVED"),
  })
  if (!enabled || !commercialUseAuthorized || !usUrl || !usKey || !providerToken || !backendApproved) {
    return response({ error: "NOT_ENABLED" }, 503, origin)
  }

  const authorization = req.headers.get("authorization") || ""
  if (!/^Bearer\s+[^\s]+$/i.test(authorization)) {
    return response({ error: "UNAUTHENTICATED" }, 401, origin)
  }
  const accessToken = authorization.replace(/^Bearer\s+/i, "")
  const client = createClient(usUrl, usKey, {
    global: { headers: { Authorization: "Bearer " + accessToken } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    const size = Number(req.headers.get("content-length") || 0)
    if (size > 4096) return response({ error: "INVALID_QUERY" }, 413, origin)
    const text = await req.text()
    if (text.length > 4096) return response({ error: "INVALID_QUERY" }, 413, origin)
    let body: unknown
    try { body = JSON.parse(text) } catch { return response({ error: "INVALID_QUERY" }, 400, origin) }

    const result = await runUSOpinionSearch(body, {
      enabled,
      commercialUseAuthorized,
      principal: async () => {
        // Auth.getUser makes a server-side verification request.
        const { data, error } = await client.auth.getUser(accessToken)
        if (error || !data.user?.id) return null
        // Require exactly one *active* membership in V1. No roles from JWT user_metadata.
        const membership = await client.from("usa_legal_memberships")
          .select("tenant_id,role").eq("user_id", data.user.id).eq("status", "active").limit(2)
        if (membership.error || !membership.data || membership.data.length !== 1) return null
        return {
          userId: data.user.id,
          tenantId: String(membership.data[0].tenant_id),
          role: membership.data[0].role,
        } as VerifiedUSPrincipal
      },
      entitled: async identity => {
        const { data, error } = await client.from("usa_legal_research_entitlements")
          .select("enabled,valid_until").eq("tenant_id", identity.tenantId)
          .eq("enabled", true).maybeSingle()
        if (error || !data?.enabled) return false
        return data.valid_until == null || (Date.parse(data.valid_until) > Date.now())
      },
      consumeQuota: async identity => {
        // REQUIRED: US-only SECURITY INVOKER (or vetted SECURITY DEFINER) RPC
        // validates auth.uid() tenant membership internally and decrements atomically.
        // In the absence of the database RPC, this fails closed (no search).
        const { data, error } = await client.rpc("usa_legal_search_consume_quota", {
          p_tenant_id: identity.tenantId,
        })
        return !error && data === true
      },
      fetchOpinions: async query => {
        const result = await searchCourtListenerOpinions({
          token: providerToken, query, maxPages: 1, timeoutMs: 7000,
        })
        return result.results
      },
      collectedAt: () => new Date().toISOString(),
    })
    return response({ success: true, ...result }, 200, origin)
  } catch (error) {
    if (error instanceof USLegalSearchDenied) {
      const status = error.code === "UNAUTHENTICATED" ? 401 :
        error.code === "QUOTA_EXHAUSTED" ? 429 :
        error.code === "CONSENT_REQUIRED" || error.code === "INVALID_QUERY" ? 400 : 403
      return response({ error: error.code }, status, origin)
    }
    // Do not echo user queries, provider payloads, token values, or sensitive errors.
    return response({ error: "US_SEARCH_UNAVAILABLE" }, 503, origin)
  }
})
