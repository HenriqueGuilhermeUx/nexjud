import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { courtFromCnj, formatCnj, isValidCnj, onlyDigits } from "../_shared/cnj.ts"
import { lookupProcess } from "../_shared/processData.ts"
import { djenByJudgingBody, djenByProcess, isDecision, outcomeCounts } from "../_shared/djen.ts"

// Consulta grátis pelo número CNJ (landing page, sem login).
// - Fonte: Escavador (licença comercial), com DataJud como reserva. Nenhuma chamada à OpenAI.
// - Uma única chamada paga por consulta (só a capa, sem movimentações).
// - Não devolve nomes de partes nem complementos de movimentação (podem ter nomes).
// - Processos com sigilo não têm detalhes exibidos.
// - Limite: 5 consultas por IP por hora e 300 por dia no total (cada consulta custa créditos).
// - O DataJud limita requisições (429) e às vezes demora: uma nova tentativa,
//   tempo máximo de 20 s e cache de 24 h
//   do resumo por hash do número.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const PER_IP_PER_HOUR = 5
const GLOBAL_PER_DAY = 300
const CACHE_HOURS = 24

async function sha256(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("")
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for") || ""
  return forwarded.split(",")[0].trim() || req.headers.get("cf-connecting-ip") || "unknown"
}

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: corsHeaders })

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405)

  const url = Deno.env.get("SUPABASE_URL") || ""
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
  if (!url || !serviceRole) return json({ error: "Consulta indisponível no momento." }, 503)

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
    const lookup = await lookupProcess(cnj, { movements: false })
    if (lookup.credits > 0) {
      await admin.from("provider_usage").insert({ user_id: null, provider: "escavador", route: "public-lookup/capa", credits_cents: Math.round(lookup.credits) })
    }
    const respond = async (payload: Record<string, unknown>) => {
      await admin.from("public_process_lookup_cache").upsert({ cnj_hash: cnjHash, payload, cached_at: new Date().toISOString() })
      return json(payload)
    }
    if (!lookup.found) {
      if (lookup.reason !== "not_found") {
        console.error("public-process-lookup", lookup.reason)
        return json({ error: "As bases de processos não responderam agora. Tente de novo em alguns minutos." }, 503)
      }
      // "Não encontrado" não vai para o cache: o processo pode aparecer depois.
      return json({
        cnj: formatCnj(cnj),
        court,
        source: lookup.source === "escavador" ? "Escavador" : "DataJud (CNJ)",
        found: false,
        message: "Não encontramos este processo nas bases consultadas. Processos muito recentes ou em segredo de justiça podem não aparecer.",
      })
    }
    found = true
    const p = lookup.summary
    const base = {
      cnj: p.cnj,
      court: { alias: court.alias, name: p.court || court.name },
      source: lookup.source === "escavador" ? "Escavador, a partir de dados públicos dos tribunais" : "DataJud (CNJ) — API pública",
    }
    if (p.restricted) {
      return respond({ ...base, found: true, restricted: true, message: "Este processo tem sigilo. Não exibimos detalhes." })
    }
    // Amostra do dossiê do juízo (DJEN, gratuito): só contagens, nunca nomes ou textos.
    let judgeTeaser: Record<string, unknown> | null = null
    try {
      const own = await djenByProcess(cnj, 20)
      const withBody = own.ok ? own.items.find((i) => i.judgingBodyId) : null
      if (withBody?.judgingBodyId && withBody.court) {
        const sample = await djenByJudgingBody(withBody.court, withBody.judgingBodyId, 120)
        if (sample.ok) {
          const decisions = sample.items.filter(isDecision).filter((d) => (d.processNumber || "").replace(/\D/g, "") !== cnj)
          judgeTeaser = { judgingBody: withBody.judgingBody, windowDays: 120, decisions: decisions.length, outcomes: outcomeCounts(decisions) }
        }
      }
    } catch { /* a consulta grátis segue sem a amostra */ }

    // Nunca inclui partes, polos ou texto de movimentações na consulta grátis.
    return respond({
      judgeTeaser,
      ...base,
      found: true,
      restricted: false,
      process: {
        courtUnit: p.courtUnit,
        className: p.className,
        subjects: p.subjects,
        instance: null,
        filingDate: p.filingDate,
        lastUpdate: p.lastMovementDate,
        movementsCount: p.movementsCount,
        recentMovements: [],
      },
    })
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError"
    console.error("public-process-lookup", timedOut ? "timeout" : error instanceof Error ? error.message : String(error))
    return json({ error: "Não foi possível concluir a consulta agora." }, 500)
  } finally {
    await admin.from("public_process_lookups").insert({
      ip_hash: ipHash,
      cnj_hash: cnjHash,
      court_alias: court.alias,
      found,
    })
  }
})
