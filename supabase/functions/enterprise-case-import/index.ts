// NexJud Enterprise — staged only; do not deploy before production review.
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { validateImportPayload } from "./validation.ts"

const MAX_BYTES = 512_000
const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
}
function response(status: number, data: unknown, origin: string | null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, ...(origin ? { "Access-Control-Allow-Origin": origin } : {}) },
  })
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
export async function handleImportRequest(req: Request): Promise<Response> {
  const allowedOrigins = (Deno.env.get("ENTERPRISE_ALLOWED_ORIGINS") || "")
    .split(",").map((s) => s.trim()).filter(Boolean)
  const origin = req.headers.get("origin")
  const corsOrigin = origin && allowedOrigins.includes(origin) ? origin : null
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: corsOrigin ? 204 : 403,
      headers: { ...headers, ...(corsOrigin ? { "Access-Control-Allow-Origin": corsOrigin } : {}) },
    })
  }
  if (origin && !corsOrigin) return response(403, { error: "origin_not_allowed" }, null)
  if (req.method !== "POST") return response(405, { error: "method_not_allowed" }, corsOrigin)
  const authorization = req.headers.get("authorization") || ""
  if (!/^Bearer\s+\S+$/i.test(authorization)) {
    return response(401, { error: "unauthorized" }, corsOrigin)
  }
  const url = Deno.env.get("SUPABASE_URL")
  const key = Deno.env.get("SUPABASE_ANON_KEY")
  if (!url || !key) return response(503, { error: "unavailable" }, corsOrigin)
  const token = authorization.replace(/^Bearer\s+/i, "")
  const supabase = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: identity, error: authError } = await supabase.auth.getUser(token)
  if (authError || !identity.user) return response(401, { error: "unauthorized" }, corsOrigin)
  const contentLength = Number(req.headers.get("content-length") || "0")
  if (!Number.isFinite(contentLength) || contentLength > MAX_BYTES) {
    return response(413, { error: "payload_too_large" }, corsOrigin)
  }
  let payload: unknown
  try {
    const raw = await req.text()
    if (new TextEncoder().encode(raw).byteLength > MAX_BYTES) {
      return response(413, { error: "payload_too_large" }, corsOrigin)
    }
    payload = JSON.parse(raw)
  } catch {
    return response(400, { error: "invalid_json" }, corsOrigin)
  }
  if (!validateImportPayload(payload)) {
    return response(400, { error: "invalid_import" }, corsOrigin)
  }
  try {
    const { data, error } = await supabase.rpc("enterprise_import_cases", {
      p_organization: payload.organizationId,
      p_key: payload.idempotencyKey,
      p_items: payload.items,
    })
    if (error) {
      const code = error.code
      if (code === "23505") return response(409, { error: "idempotency_conflict" }, corsOrigin)
      if (code === "42501") return response(403, { error: "forbidden" }, corsOrigin)
      if (code === "28000") return response(401, { error: "unauthorized" }, corsOrigin)
      if (code === "22023" || code === "23514" || code === "22P02") {
        return response(400, { error: "invalid_import" }, corsOrigin)
      }
      return response(503, { error: "unavailable" }, corsOrigin)
    }
    if (!isRecord(data) || !isRecord(data.receipt) ||
      !["created", "already_processed"].includes(String(data.status))) {
      return response(503, { error: "unavailable" }, corsOrigin)
    }
    return response(data.status === "created" ? 201 : 200, data, corsOrigin)
  } catch {
    return response(503, { error: "unavailable" }, corsOrigin)
  }
}

Deno.serve(handleImportRequest)
