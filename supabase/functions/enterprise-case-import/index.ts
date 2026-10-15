// Staging-only Edge Function entrypoint. No production deploy without review.
import "jsr:@supabase/functions-js@2.117.3/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2.117.3"
import { handleImportRequest, type ImportHttpRuntime } from "./handler.ts"

Deno.serve((req: Request) => {
  const url = Deno.env.get("SUPABASE_URL")
  const key = Deno.env.get("SUPABASE_ANON_KEY")
  const allowedOrigins = (Deno.env.get("ENTERPRISE_ALLOWED_ORIGINS") || "")
    .split(",").map(s => s.trim()).filter(Boolean)
  const clientFor = (token: string) => createClient(url!, key!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const runtime: ImportHttpRuntime = {
    allowedOrigins,
    configured: Boolean(url && key),
    async verifyUser(token) {
      const { data, error } = await clientFor(token).auth.getUser(token)
      return !error && Boolean(data.user)
    },
    async commit(token, payload) {
      const { data, error } = await clientFor(token).rpc("enterprise_import_cases", {
        p_organization: payload.organizationId,
        p_key: payload.idempotencyKey,
        p_items: payload.items,
      })
      return { data, error: error ? { code: error.code } : null }
    },
  }
  return handleImportRequest(req, runtime)
})
