/**
 * NexJud USA — authenticated pilot-access status (ISOLATED, UNDEPLOYED).
 *
 * A read-only service: verifies Supabase Auth JWT, checks an active membership
 * under RLS and re-checks tenant status through usa_legal_pilot_access_ready.
 * It does NOT execute court searches, issue invitations or provision tenants.
 * Nothing is enabled unless both US backend approvals and the pilot flag pass.
 */
import { createClient } from "jsr:@supabase/supabase-js@2"
import { isUSBackendConfigurationApproved } from "../../../src/intelligence/usa/sharedBackendConfig.ts"
import { verifiedUSPrincipalFromMembership } from "../../../src/intelligence/usa/usPrincipalMapping.ts"

const env = (key: string) => Deno.env.get(key) || ""
const allowedOrigin = (origin: string | null): boolean =>
  Boolean(origin && origin.startsWith("https://") && origin === env("USA_ALLOWED_WEB_ORIGIN"))

function reply(status: number, payload: Record<string, unknown>, origin: string | null) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
  })
  if (allowedOrigin(origin)) {
    headers.set("Access-Control-Allow-Origin", origin!)
    headers.set("Access-Control-Allow-Headers", "authorization, apikey, content-type, x-client-info")
    headers.set("Access-Control-Allow-Methods", "GET, OPTIONS")
  }
  return new Response(JSON.stringify(payload), { status, headers })
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin")
  if (!allowedOrigin(origin)) return reply(403, { error: "FORBIDDEN_ORIGIN" }, null)
  if (request.method === "OPTIONS") return reply(200, { ok: true }, origin)
  if (request.method !== "GET") return reply(405, { error: "METHOD_NOT_ALLOWED" }, origin)

  const url = env("USA_SUPABASE_URL")
  const key = env("USA_SUPABASE_PUBLISHABLE_KEY")
  if (env("USA_PILOT_ACCESS_ENABLED") !== "true" ||
      !isUSBackendConfigurationApproved({
        mode: env("USA_BACKEND_MODE"),
        url,
        publishableKey: key,
        expectedProjectRef: env("USA_EXPECTED_SUPABASE_PROJECT_REF"),
        protectedBrazilProjectRef: env("USA_PROTECTED_BRAZIL_PROJECT_REF"),
        sharedPartitionReviewed: env("USA_SHARED_PARTITION_REVIEWED"),
        sharedScopeApproved: env("USA_SHARED_SCOPE_APPROVED"),
      })) {
    return reply(503, { error: "NOT_ENABLED" }, origin)
  }

  const auth = request.headers.get("authorization") || ""
  if (!/^Bearer\s+[^\s]+$/i.test(auth) || auth.length > 8192) {
    return reply(401, { error: "UNAUTHENTICATED" }, origin)
  }
  const token = auth.replace(/^Bearer\s+/i, "")
  try {
    const client = createClient(url, key, {
      global: { headers: { Authorization: "Bearer " + token } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { data: userData, error: authError } = await client.auth.getUser(token)
    if (authError || !userData.user?.id) return reply(401, { error: "UNAUTHENTICATED" }, origin)

    const membership = await client.from("usa_legal_memberships")
      .select("tenant_id,role").eq("user_id", userData.user.id)
      .eq("status", "active").limit(2)
    if (membership.error) return reply(503, { error: "PILOT_UNAVAILABLE" }, origin)

    const principal = verifiedUSPrincipalFromMembership(userData.user.id, membership.data)
    if (!principal) return reply(403, { error: "US_PILOT_NOT_AUTHORIZED" }, origin)

    // This RPC checks the server-side auth.uid() against an ACTIVE US tenant.
    // It never trusts the caller's tenant id or role from the request.
    const pilot = await client.rpc("usa_legal_pilot_access_ready")
    if (pilot.error) return reply(503, { error: "PILOT_UNAVAILABLE" }, origin)
    if (pilot.data !== true) return reply(403, { error: "US_PILOT_NOT_AUTHORIZED" }, origin)

    return reply(200, {
      access: "ACTIVE_PILOT",
      role: principal.role,
      legalSearchAvailable: false,
      predictiveModelAvailable: false,
    }, origin)
  } catch {
    // Never echo auth tokens, Supabase query messages, or user profile fields.
    return reply(503, { error: "PILOT_UNAVAILABLE" }, origin)
  }
})
