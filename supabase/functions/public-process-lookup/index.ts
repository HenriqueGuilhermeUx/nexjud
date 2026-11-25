import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { courtFromCnj, formatCnj, isValidCnj, onlyDigits } from "../_shared/cnj.ts"
import { datajudSearch } from "../_shared/datajud.ts"

// Consulta grátis pelo número CNJ (landing page, sem login).
// - Só DataJud (metadados públicos). Nenhuma chamada à OpenAI.
// - Não devolve nomes de partes nem complementos de movimentação (podem ter nomes).
// - Processos com sigilo não têm detalhes exibidos.
// - Limite: 10 consultas por IP por hora e 3.000 por dia no total.
// - O DataJud limita requisições (429) e às vezes demora: uma nova tentativa,
//   tempo máximo de 20 s, desvio pela Netlify (_shared/datajud.ts) e cache de 6 h
//   do resumo por hash do número.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const PER_IP_PER_HOUR = 10
const GLOBAL_PER_DAY = 3000
const CACHE_HOURS = 6

async function sha256(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("")
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for") || ""
  return forwarded.split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "unknown"
}

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: corsHeaders })

// deno-lint-ignore no-explicit-any
function summarize(source: any) {
  // deno-lint-ignore no-explicit-any
  const movements: any[] = Array.isArray(source.movimentos) ? source.movimentos : []
  const sorted = [...movements].sort((a, b) => String(b.dataHora || "").localeCompare(String(a.dataHora || "")))
  // deno-lint-ignore no-explicit-any
  const subjects = Array.isArray(source.assuntos) ? source.assuntos.map((a: any) => a?.nome).filter(Boolean) : []
  return {
    courtUnit: source.orgaoJulgador?.nome || null,
    className: source.classe?.nome || null,
    subjects,
    system: source.sistema?.nome || null,
    format: source.formato?.nome || null,
    instance: source.grau || null,
    filingDate: source.dataAjuizamento || null,
    lastUpdate: source.dataHoraUltimaAtualizacao || null,
    movementsCount: movements.length,
    // deno-lint-ignore no-explicit-any
    recentMovements: sorted.slice(0, 8).map((m: any) => ({ date: m.dataHora || null, name: m.nome || "Movimentação" })),
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405)

  const url = Deno.env.get("SUPABASE_URL") || ""
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  const datajudKey = Deno.env.get("DATAJUD_API_KEY") || ""
  if (!url || !serviceRole || !datajudKey) return json({ error: "Consulta indisponível no momento." }, 503)

  const body = await req.json().catch(() => ({}))
  const cnj = onlyDigits(String(body.cnj || ""))
  if (cnj.length !== 20) return json({ error: "Informe o número do processo com 20 dígitos (padrão CNJ)." }, 400)
  if (!isValidCnj(cnj)) return json({ error: "Esse número CNJ não é válido. Confira os dígitos." }, 400)

  const court = courtFromCnj(cnj)
  if (!court) {
    return json({ error: "Por enquanto a consulta grátis cobre Tribunais de Justiça, TRFs e TRTs." }, 400)
  }

  const admin = createClient(url, serviceRole, { auth: { persistSession: false } })
  const ipHash = await sha256(`${clientIp(req)}|${url}`)
  const hourAgo = new Date(Date.now() - 3600_000).toISOString()
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString()

  const [{ count: ipCount }, { count: dayCount }] = await Promise.all([
    admin.from("public_process_lookups").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", hourAgo),
    admin.from("public_process_lookups").select("id", { count: "exact", head: true }).gte("created_at", dayAgo),
  ])
  if ((ipCount || 0) >= PER_IP_PER_HOUR) {
    return json({ error: "Você atingiu o limite de consultas grátis desta hora. Crie sua conta para continuar.", limit: true }, 429)
  }
  if ((dayCount || 0) >= GLOBAL_PER_DAY) {
    return json({ error: "A consulta grátis está muito procurada agora. Tente mais tarde ou crie sua conta.", limit: true }, 429)
  }

  const cnjHash = await sha256(cnj)
  const { data: cached } = await admin
    .from("public_process_lookup_cache")
    .select("payload,cached_at")
    .eq("cnj_hash", cnjHash)
    .gte("cached_at", new Date(Date.now() - CACHE_HOURS * 3600_000).toISOString())
    .maybeSingle()

  let found = false
  try {
    if (cached?.payload) {
      found = Boolean(cached.payload.found)
      return json({ ...cached.payload, cachedAt: cached.cached_at })
    }
    const { response, via } = await datajudSearch(court.alias, { size: 1, query: { match: { numeroProcesso: cnj } } }, datajudKey)
    if (!response.ok) {
      console.error("public-process-lookup datajud", court.alias, via, response.status)
      return json({ error: "O DataJud não respondeu agora. Tente de novo em alguns minutos." }, 502)
    }
    const data = await response.json()
    const source = data?.hits?.hits?.[0]?._source
    found = Boolean(source)

    const base = { cnj: formatCnj(cnj), court, source: "DataJud (CNJ) — API pública" }
    const respond = async (payload: Record<string, unknown>) => {
      await admin.from("public_process_lookup_cache").upsert({ cnj_hash: cnjHash, payload, cached_at: new Date().toISOString() })
      return json(payload)
    }
    if (!source) {
      // "Não encontrado" não vai para o cache: o processo pode aparecer no DataJud depois.
      return json({
        ...base,
        found: false,
        message: "Não encontramos este processo na base pública do DataJud. Processos muito recentes ou em segredo de justiça podem não aparecer.",
      })
    }
    if (Number(source.nivelSigilo || 0) > 0) {
      return respond({ ...base, found: true, restricted: true, message: "Este processo tem sigilo. Não exibimos detalhes." })
    }
    return respond({ ...base, found: true, restricted: false, process: summarize(source) })
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError"
    console.error("public-process-lookup", timedOut ? "datajud timeout" : error instanceof Error ? error.message : String(error))
    return json({ error: timedOut ? "O DataJud demorou demais para responder. Tente de novo em instantes." : "Não foi possível concluir a consulta agora." }, timedOut ? 504 : 500)
  } finally {
    await admin.from("public_process_lookups").insert({
      ip_hash: ipHash,
      cnj_hash: cnjHash,
      court_alias: court.alias,
      found,
    })
  }
})
