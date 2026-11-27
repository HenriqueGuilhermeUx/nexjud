import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { requireUser } from "../_shared/requireUser.ts"
import { courtFromCnj, formatCnj, onlyDigits } from "../_shared/cnj.ts"
import { lookupFailureMessage, lookupProcess, type ProcessLookup, type ProcessSummary } from "../_shared/processData.ts"
import { djenByJudgingBody, djenByProcess, isDecision, outcomeCounts, type DjenPublication } from "../_shared/djen.ts"

// DNA do Juiz.
// 1) Capa, partes e movimentações do processo: Escavador (DataJud como reserva).
// 2) Publicações do próprio processo no DJEN (CNJ), com o texto das decisões.
// 3) Dossiê do juízo: decisões do mesmo órgão no DJEN (código do órgão, 120 dias).
// 4) Leitura pela IA: teses sugeridas (conforme o lado do cliente) e, se houver tese,
//    o confronto dela com as decisões. Sem percentuais nem previsão.
// O contexto (1–3) fica 24 h em cache (dna_context_cache): trocar a tese não paga outra consulta.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const CACHE_HOURS = 24

// deno-lint-ignore no-explicit-any
type Any = any

const OUTCOME_LABEL: Record<string, string> = {
  procedente: "Procedente",
  parcialmente_procedente: "Parcialmente procedente",
  improcedente: "Improcedente",
  extinto_sem_merito: "Extinto sem mérito",
  homologacao: "Homologação",
  deferido: "Deferido",
  indeferido: "Indeferido",
}

const KIND_LABEL: Record<string, string> = {
  sentenca: "Sentença", acordao: "Acórdão", decisao: "Decisão", despacho: "Despacho", outro: "Publicação",
}

type Side = "autor" | "reu" | null

type Context = {
  lookup: { found: boolean; source: string; reason: string | null; credits: number; summary: ProcessSummary | null }
  ownOk: boolean
  ownError: string | null
  own: DjenPublication[]
  sampleOk: boolean | null
  sample: DjenPublication[]
  sampleRead: number
  judgingBody: string | null
  judgingBodyId: string | null
  courtSigla: string | null
}

async function sha256(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("")
}

function excerpt(text: string, size = 420) {
  const clean = text.replace(/\s+/g, " ").trim()
  return clean.length > size ? `${clean.slice(0, size)}…` : clean
}

function publicView(p: DjenPublication) {
  return {
    id: p.id, date: p.date, processNumber: p.processNumber, kind: p.kind, kindLabel: KIND_LABEL[p.kind],
    outcome: p.outcome, outcomeLabel: p.outcome ? OUTCOME_LABEL[p.outcome] : null,
    documentType: p.documentType, className: p.className, excerpt: excerpt(p.text), link: p.link,
  }
}

function period(dates: (string | null)[]) {
  const valid = dates.filter(Boolean).map((x) => new Date(String(x))).filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())
  if (!valid.length) return null
  const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" })
  return `${fmt(valid[0])} – ${fmt(valid[valid.length - 1])}`
}

async function buildContext(cnj: string): Promise<Context> {
  const court = courtFromCnj(cnj)
  const [lookup, ownPage]: [ProcessLookup, Awaited<ReturnType<typeof djenByProcess>>] = await Promise.all([
    lookupProcess(cnj, { movements: true, includeParties: true, includeMovementText: true }),
    djenByProcess(cnj, 50),
  ])
  const own = ownPage.ok ? ownPage.items : []
  // O código do órgão no DJEN (idOrgao) é o que permite achar as outras decisões do juízo.
  const ownWithBody = own.find((d) => d.judgingBodyId)
  const p = lookup.found ? lookup.summary : null
  const judgingBody = ownWithBody?.judgingBody || p?.courtUnit || null
  const judgingBodyId = ownWithBody?.judgingBodyId || null
  const courtSigla = own.find((d) => d.court)?.court || court?.name || null

  let sampleOk: boolean | null = null
  let sample: DjenPublication[] = []
  let sampleRead = 0
  if (judgingBodyId && courtSigla) {
    const page = await djenByJudgingBody(courtSigla, judgingBodyId, 120)
    sampleOk = page.ok
    if (page.ok) {
      sampleRead = page.items.length
      sample = page.items
        .filter(isDecision)
        .filter((d) => onlyDigits(d.processNumber || "") !== cnj)
        .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
    }
  }
  return {
    lookup: {
      found: lookup.found,
      source: lookup.source,
      reason: lookup.found ? null : (lookup as { reason?: string }).reason || "not_found",
      credits: lookup.credits,
      summary: p,
    },
    ownOk: ownPage.ok,
    ownError: ownPage.ok ? null : (ownPage as { error?: string }).error || "unavailable",
    own: own.slice(0, 15),
    sampleOk,
    sample: sample.slice(0, 60),
    sampleRead,
    judgingBody,
    judgingBodyId,
    courtSigla,
  }
}

type ThesisRef = { label: string; date: string | null; kind: string; link: string | null; processNumber: string | null }
type Thesis = { type: string; title: string; thesis: string; basis: string; refs: ThesisRef[] }

type Reading = {
  summary: string | null
  adherences: string[]
  divergences: string[]
  risks: string[]
  opportunities: string[]
  judgePatterns: string[]
  recurringGrounds: string[]
  suggestedTheses: Thesis[]
}

async function readCase(argument: string, side: Side, ctx: Context): Promise<Reading | null> {
  const key = Deno.env.get("OPENAI_API_KEY")
  if (!key) return null
  const p = ctx.lookup.summary
  const ownDecisions = ctx.own.filter(isDecision)
  const own = (ownDecisions.length ? ownDecisions : ctx.own).slice(0, 5)
  const sample = ctx.sample.slice(0, 10)
  if (!p && !own.length && !sample.length) return null

  const refs = new Map<string, DjenPublication>()
  const ownDocs = own.map((d, i) => { refs.set(`P${i + 1}`, d); return { ref: `P${i + 1}`, data: d.date, tipo: KIND_LABEL[d.kind], texto: d.text.slice(0, 2200) } })
  const sampleDocs = sample.map((d, i) => { refs.set(`D${i + 1}`, d); return { ref: `D${i + 1}`, data: d.date, tipo: KIND_LABEL[d.kind], classe: d.className, resultadoLido: d.outcome, texto: d.text.slice(0, 1500) } })
  const facts = p ? {
    tribunal: p.court, orgao: p.courtUnit, classe: p.className, assuntos: p.subjects, area: p.area,
    distribuicao: p.filingDate, valorCausa: p.causeValue, poloAtivo: p.activeSide, poloPassivo: p.passiveSide,
    quantidadeMovimentacoes: p.movementsCount,
    movimentacoes: p.recentMovements.slice(0, 12).map((m) => ({ data: m.date, tipo: m.name, texto: m.content ? m.content.slice(0, 300) : undefined })),
  } : null
  const sideText = side === "autor"
    ? "o AUTOR (polo ativo)"
    : side === "reu"
      ? "o RÉU (polo passivo)"
      : "não informado — proponha pensando no polo ativo e diga isso no summary"

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(50_000),
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Você é um advogado brasileiro sênior preparando um dossiê de estratégia para um colega. " +
              "Use apenas os dados e textos fornecidos (capa do processo, publicações oficiais do próprio processo no DJEN — refs P1, P2… — e decisões recentes do mesmo juízo — refs D1, D2…). " +
              "Cite as refs quando apoiar uma afirmação. Quando faltar informação, diga o que falta. " +
              "Nunca dê percentuais, chances ou previsão de resultado; não atribua opinião pessoal ao magistrado: descreva o que as decisões publicadas mostram. " +
              "Responda em JSON com as chaves: " +
              "summary (string curta, linguagem direta); " +
              "suggestedTheses (lista de exatamente 3 objetos {type: 'principal'|'subsidiaria'|'risco', title: até 8 palavras, thesis: 2 a 3 frases prontas para usar, basis: 1 frase dizendo em que se apoia, refs: lista de refs}) — 'principal' e 'subsidiaria' a favor do cliente; 'risco' é o argumento mais provável da parte contrária; " +
              "adherences, divergences, risks, opportunities (sobre a tese do usuário, se houver; senão sobre o caso), judgePatterns (padrões observados nas decisões do juízo), recurringGrounds (fundamentos, artigos e súmulas que se repetem) — listas de frases curtas, no máximo 5 itens cada.",
          },
          {
            role: "user",
            content: [
              `Cliente do usuário: ${sideText}`,
              `Tese do usuário:\n${argument ? argument.slice(0, 4000) : "(não informada — foque nas teses sugeridas)"}`,
              `Juízo: ${ctx.judgingBody || "não identificado"}`,
              `Dados do processo:\n${facts ? JSON.stringify(facts).slice(0, 6000) : "(capa indisponível)"}`,
              `Publicações do próprio processo (DJEN):\n${JSON.stringify(ownDocs).slice(0, 11000)}`,
              `Decisões recentes do mesmo juízo (DJEN):\n${JSON.stringify(sampleDocs).slice(0, 15000)}`,
            ].join("\n\n"),
          },
        ],
      }),
    })
    if (!response.ok) return null
    const data = await response.json()
    const parsed = JSON.parse(data?.choices?.[0]?.message?.content || "{}")
    const list = (v: Any) => Array.isArray(v) ? v.map(String).filter(Boolean).slice(0, 5) : []
    const theses: Thesis[] = (Array.isArray(parsed.suggestedTheses) ? parsed.suggestedTheses : []).slice(0, 3).map((t: Any) => ({
      type: ["principal", "subsidiaria", "risco"].includes(t?.type) ? t.type : "principal",
      title: String(t?.title || "").slice(0, 120),
      thesis: String(t?.thesis || "").slice(0, 1200),
      basis: String(t?.basis || "").slice(0, 400),
      refs: (Array.isArray(t?.refs) ? t.refs : []).map(String).filter((r: string) => refs.has(r)).slice(0, 4).map((r: string) => {
        const d = refs.get(r)!
        return { label: r, date: d.date, kind: KIND_LABEL[d.kind], link: d.link, processNumber: d.processNumber }
      }),
    })).filter((t: Thesis) => t.thesis)
    return {
      summary: typeof parsed.summary === "string" ? parsed.summary : null,
      adherences: list(parsed.adherences), divergences: list(parsed.divergences), risks: list(parsed.risks),
      opportunities: list(parsed.opportunities), judgePatterns: list(parsed.judgePatterns), recurringGrounds: list(parsed.recurringGrounds),
      suggestedTheses: theses,
    }
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return Response.json({ error: "Método não permitido." }, { status: 405, headers: corsHeaders })
  const auth = await requireUser(req, corsHeaders)
  if (!auth.ok) return auth.response

  try {
    const body = await req.json().catch(() => ({}))
    const cnj = onlyDigits(String(body.cnj || ""))
    if (cnj.length !== 20) return Response.json({ error: "Informe um número CNJ de 20 dígitos." }, { status: 400, headers: corsHeaders })
    const court = courtFromCnj(cnj)
    const alias = court?.alias || String(body.tribunalAlias || "").trim()
    const argument = String(body.argument || "").trim()
    const side: Side = body.side === "autor" || body.side === "reu" ? body.side : null

    const admin = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "", { auth: { persistSession: false } })
    const cnjHash = await sha256(`dna|${cnj}`)
    const { data: cached } = await admin.from("dna_context_cache").select("payload,cached_at").eq("cnj_hash", cnjHash)
      .gte("cached_at", new Date(Date.now() - CACHE_HOURS * 3600_000).toISOString()).maybeSingle()

    let ctx: Context
    if (cached?.payload) {
      ctx = cached.payload as Context
    } else {
      ctx = await buildContext(cnj)
      if (ctx.lookup.credits > 0) {
        await admin.from("provider_usage").insert({ user_id: auth.userId, provider: "escavador", route: "dna/capa+movimentacoes", credits_cents: Math.round(ctx.lookup.credits) })
      }
      if (ctx.lookup.found || ctx.own.length) {
        await admin.from("dna_context_cache").upsert({ cnj_hash: cnjHash, payload: ctx, cached_at: new Date().toISOString() })
      }
    }
    console.info("dna", JSON.stringify({ cached: Boolean(cached?.payload), lookup: ctx.lookup.found ? ctx.lookup.source : ctx.lookup.reason, djenOwn: ctx.ownOk ? ctx.own.length : ctx.ownError, sampleRead: ctx.sampleRead }))

    const p = ctx.lookup.summary
    if (!p && !ctx.own.length) {
      const failure = lookupFailureMessage({ found: false, source: "none", reason: ctx.lookup.reason || "not_found", credits: 0 })
      if (failure.status !== 200) return Response.json({ error: failure.message }, { status: failure.status, headers: corsHeaders })
      return Response.json({ success: true, found: false, alias, warning: failure.message }, { headers: corsHeaders })
    }

    const reading = await readCase(argument, side, ctx)
    const sourceLabel = ctx.lookup.found ? (ctx.lookup.source === "escavador" ? "Escavador" : "DataJud/CNJ") : null
    const sources = [sourceLabel, ctx.own.length || ctx.sampleRead ? "DJEN/CNJ" : null].filter(Boolean).join(" + ")
    const ownDecisionsCount = ctx.own.filter(isDecision).length

    const djenStatus = !ctx.ownOk
      ? (ctx.ownError === "rate_limited" ? "O DJEN limitou as consultas agora; tente de novo em alguns minutos." : "O DJEN não respondeu agora.")
      : !ctx.judgingBodyId
        ? "Este processo ainda não tem publicações no DJEN; sem elas não dá para identificar o juízo e montar o dossiê."
        : ctx.sampleOk === false
          ? "As publicações do juízo não puderam ser lidas agora."
          : null

    return Response.json({
      success: true,
      found: true,
      alias,
      side,
      cached: Boolean(cached?.payload),
      process: p ? {
        number: formatCnj(p.cnj),
        court: p.court || court?.name || "-",
        courtUnit: p.courtUnit || ctx.judgingBody || "-",
        className: p.className || "-",
        subject: p.subjects.join(", ") || "-",
        area: p.area,
        causeValue: p.causeValue,
        filingDate: p.filingDate,
        lastMovementDate: p.lastMovementDate,
        movementsCount: p.movementsCount,
        activeSide: p.activeSide ?? null,
        passiveSide: p.passiveSide ?? null,
        parties: p.parties ?? [],
        recentMovements: p.recentMovements.slice(0, 10),
      } : {
        number: formatCnj(cnj),
        court: ctx.courtSigla || "-",
        courtUnit: ctx.judgingBody || "-",
        className: ctx.own[0]?.className || "-",
        subject: "-",
      },
      decisionsAnalyzed: Math.min(ownDecisionsCount || ctx.own.length, 5) + Math.min(ctx.sample.length, 10),
      decisionsFound: ctx.sample.length,
      period: period(ctx.sample.map((d) => d.date)),
      source: sources || "—",
      summary: reading?.summary ?? null,
      suggestedTheses: reading?.suggestedTheses ?? [],
      adherences: reading?.adherences ?? [],
      divergences: reading?.divergences ?? [],
      risks: reading?.risks ?? [],
      opportunities: reading?.opportunities?.length
        ? reading.opportunities
        : argument
          ? ["Confira nas decisões do juízo abaixo onde sua tese encontra apoio e onde precisa ser delimitada."]
          : ["Escolha uma das teses sugeridas ou escreva a sua para receber a leitura completa."],
      judgePatterns: reading?.judgePatterns ?? [],
      recurringGrounds: reading?.recurringGrounds ?? [],
      dossier: {
        court: ctx.courtSigla,
        judgingBody: ctx.judgingBody,
        windowDays: 120,
        publicationsRead: ctx.sampleRead,
        decisions: ctx.sample.length,
        outcomes: outcomeCounts(ctx.sample),
        outcomeLabels: OUTCOME_LABEL,
        items: ctx.sample.slice(0, 12).map(publicView),
        status: djenStatus,
      },
      processPublications: ctx.own.slice(0, 10).map(publicView),
      evidence: ctx.sample.slice(0, 30).map((d) => ({
        id: d.id, processNumber: d.processNumber, court: d.court, judgingBody: d.judgingBody, decisionDate: d.date,
        caseClass: d.className, subjects: [], source: "djen", sourceUrl: d.link, collectedAt: new Date().toISOString(),
      })),
      warning: "Dossiê montado com publicações oficiais do DJEN (CNJ) e dados do processo. A classificação do resultado é uma leitura automática do texto — confira cada decisão. Não há previsão de resultado.",
    }, { headers: corsHeaders })
  } catch (error) {
    console.error("decision-intelligence", error instanceof Error ? error.message : String(error))
    return Response.json({ error: "Não foi possível concluir a análise." }, { status: 500, headers: corsHeaders })
  }
})
