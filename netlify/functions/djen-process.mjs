import { normalizeDjenPublicPage } from "../lib/djenPublic.mjs"

const recentQueries = new Map()

const json = (status, body, extra = {}) => Response.json(body, {
  status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extra },
})

export default async function handler(request) {
  if (request.method !== "GET") return json(405, { error: "method_not_allowed" }, { Allow: "GET" })
  const origin = request.headers.get("origin")
  if (origin && origin !== new URL(request.url).origin) return json(403, { error: "forbidden_origin" })
  const url = new URL(request.url)
  const processNumber = (url.searchParams.get("process") || "").replace(/\D/g, "")
  if (processNumber.length !== 20 || !/^\d{20}$/.test(processNumber)) return json(400, { error: "invalid_cnj_process" })
  const auth = request.headers.get("authorization") || ""
  if (!/^Bearer\s+\S+$/.test(auth)) return json(401, { error: "authentication_required" })
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey || !/^https:\/\//.test(supabaseUrl)) {
    return json(503, { error: "authentication_verifier_not_configured" })
  }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    // Authorize with the user's session. Never trust a client-supplied user ID.
    let verified
    try {
      verified = await fetch(new URL("/auth/v1/user", supabaseUrl), {
        headers: { Authorization: auth, apikey: anonKey, Accept: "application/json" },
        signal: controller.signal,
      })
    } catch {
      // Auth-provider network/timeout errors must not be labeled CNJ failures.
      return json(503, { error: "authentication_verifier_unavailable" })
    }
    if (verified.status === 401 || verified.status === 403) return json(401, { error: "invalid_session" })
    if (!verified.ok) return json(503, { error: "authentication_verifier_unavailable" })
    let account
    try { account = await verified.json() }
    catch { return json(503, { error: "authentication_verifier_unavailable" }) }
    if (!account?.id || typeof account.id !== "string") return json(503, { error: "authentication_verifier_unavailable" })
    // Best-effort per-instance throttle. CNJ rate-limit headers and HTTP 429 remain authoritative.
    const now = Date.now()
    for (const [key, at] of recentQueries) if (now - at > 60000) recentQueries.delete(key)
    if (now - (recentQueries.get(account.id) || 0) < 10000) {
      return json(429, { error: "local_throttle", guidance: "Aguarde 10 segundos antes de nova consulta." }, { "Retry-After": "10" })
    }
    recentQueries.set(account.id, now)
    // One page, five records, process-scoped; public DJEN GET uses pagina/itensPorPagina. No scheduling, backfill or storage.
    const query = new URL("https://comunicaapi.pje.jus.br/api/v1/comunicacao")
    query.searchParams.set("numeroProcesso", processNumber)
    query.searchParams.set("pagina", "1")
    query.searchParams.set("itensPorPagina", "5")
    const remote = await fetch(query, {
      headers: { Accept: "application/json", "User-Agent": "NexJud-DJEN-Pilot/1.0 (on-demand, read-only)" },
      signal: controller.signal,
      redirect: "error",
    })
    if (remote.status === 429) return json(429, { error: "cnj_rate_limited", guidance: "Aguarde pelo menos um minuto antes de nova tentativa." }, { "Retry-After": "60" })
    if (remote.status === 403) return json(502, { error: "cnj_access_restricted", guidance: "O CNJ recusou a consulta deste servidor. Pode haver restrição por origem, rede ou política de acesso; não tente contornar o bloqueio." })
    if (remote.status === 400 || remote.status === 422) return json(502, { error: "cnj_query_rejected", guidance: "O CNJ rejeitou os parâmetros da consulta. Verifique a especificação oficial antes de tentar novamente." })
    if (!remote.ok) return json(502, { error: "cnj_unavailable", upstreamStatus: remote.status })
    const raw = await remote.text()
    if (raw.length > 2000000) return json(502, { error: "cnj_response_too_large" })
    let reduced
    try { reduced = normalizeDjenPublicPage(JSON.parse(raw), processNumber) }
    catch { return json(502, { error: "cnj_unexpected_format", guidance: "A resposta pública do CNJ mudou ou está incompleta. A consulta não foi considerada vazia." }) }
    return json(200, reduced)
  } catch {
    return json(502, { error: "cnj_query_failed" })
  } finally {
    clearTimeout(timeout)
  }
}
