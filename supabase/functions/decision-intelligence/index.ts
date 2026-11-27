import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { requireUser } from "../_shared/requireUser.ts"
import { courtFromCnj, formatCnj, onlyDigits } from "../_shared/cnj.ts"
import { lookupFailureMessage, lookupProcess, type ProcessSummary } from "../_shared/processData.ts"
import { djenByJudgingBody, djenByProcess, isDecision, outcomeCounts, type DjenPublication } from "../_shared/djen.ts"

// DNA do Juiz.
// 1) Capa, partes e movimentações do processo: Escavador (DataJud como reserva).
// 2) Publicações do próprio processo no DJEN (CNJ), com o texto das decisões.
// 3) Dossiê do juízo: amostra das decisões publicadas pelo mesmo órgão julgador
//    (vara, câmara ou turma) no DJEN nos últimos 120 dias.
// 4) Leitura da tese contra tudo isso pela IA, sem percentuais nem previsão.
// Cada etapa é opcional: se uma fonte falhar, a análise continua com as outras.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

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

function excerpt(text: string, size = 420) {
  const clean = text.replace(/\s+/g, " ").trim()
  return clean.length > size ? `${clean.slice(0, size)}…` : clean
}

function publicView(p: DjenPublication) {
  return {
    id: p.id,
    date: p.date,
    processNumber: p.processNumber,
    kind: p.kind,
    kindLabel: KIND_LABEL[p.kind],
    outcome: p.outcome,
    outcomeLabel: p.outcome ? OUTCOME_LABEL[p.outcome] : null,
    documentType: p.documentType,
    className: p.className,
    excerpt: excerpt(p.text),
    link: p.link,
  }
}

function period(dates: (string | null)[]) {
  const valid = dates.filter(Boolean).map((x) => new Date(String(x))).filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => a.getTime() - b.getTime())
  if (!valid.length) return null
  const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" })
  return `${fmt(valid[0])} – ${fmt(valid[valid.length - 1])}`
}

type Reading = {
  summary: string | null
  adherences: string[]
  divergences: string[]
  risks: string[]
  opportunities: string[]
  judgePatterns: string[]
  recurringGrounds: string[]
}

async function readCase(argument: string, p: ProcessSummary | null, own: DjenPublication[], sample: DjenPublication[], judgingBody: string | null): Promise<Reading | null> {
  const key = Deno.env.get("OPENAI_API_KEY")
  if (!key) return null
  if (!argument && !own.length && !sample.length) return null
  const facts = p ? {
    tribunal: p.court, orgao: p.courtUnit, classe: p.className, assuntos: p.subjects, area: p.area,
    distribuicao: p.filingDate, valorCausa: p.causeValue, quantidadeMovimentacoes: p.movementsCount,
    movimentacoes: p.recentMovements.slice(0, 12).map((m) => ({ data: m.date, tipo: m.name, texto: m.content ? m.content.slice(0, 300) : undefined })),
  } : null
  const ownDocs = own.slice(0, 5).map((d) => ({ data: d.date, tipo: KIND_LABEL[d.kind], texto: d.text.slice(0, 2200) }))
  const sampleDocs = sample.slice(0, 10).map((d) => ({ data: d.date, tipo: KIND_LABEL[d.kind], classe: d.className, resultadoLido: d.outcome, texto: d.text.slice(0, 1500) }))
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(45_000),
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Você é um advogado brasileiro sênior preparando um dossiê de estratégia. " +
              "Use apenas os dados e textos fornecidos (capa do processo, publicações oficiais do próprio processo no DJEN e uma amostra de decisões recentes do mesmo juízo). " +
              "Cite datas ou trechos curtos quando apoiar uma afirmação. Quando faltar informação, diga o que falta. " +
              "Nunca dê percentuais, chances ou previsão de resultado; não atribua opinião pessoal ao magistrado, descreva o que as decisões publicadas mostram. " +
              "Responda em JSON com as chaves: summary (string curta), adherences, divergences, risks, opportunities, judgePatterns (padrões observados nas decisões do juízo), recurringGrounds (fundamentos e precedentes que se repetem) — listas de frases curtas, no máximo 5 itens cada.",
          },
          {
            role: "user",
            content: [
              `Tese do usuário:\n${argument ? argument.slice(0, 4000) : "(não informada — faça leitura geral do caso e do juízo)"}`,
              `Juízo: ${judgingBody || "não identificado"}`,
              `Dados do processo:\n${facts ? JSON.stringify(facts).slice(0, 6000) : "(capa indisponível)"}`,
              `Publicações do próprio processo (DJEN):\n${JSON.stringify(ownDocs).slice(0, 11000)}`,
              `Amostra de decisões do mesmo juízo (DJEN):\n${JSON.stringify(sampleDocs).slice(0, 15000)}`,
            ].join("\n\n"),
          },
        ],
      }),
    })
    if (!response.ok) return null
    const data = await response.json()
    const parsed = JSON.parse(data?.choices?.[0]?.message?.content || "{}")
    const list = (v: Any) => Array.isArray(v) ? v.map(String).filter(Boolean).slice(0, 5) : []
    return {
      summary: typeof parsed.summary === "string" ? parsed.summary : null,
      adherences: list(parsed.adherences),
      divergences: list(parsed.divergences),
      risks: list(parsed.risks),
      opportunities: list(parsed.opportunities),
      judgePatterns: list(parsed.judgePatterns),
      recurringGrounds: list(parsed.recurringGrounds),
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

    const [lookup, ownPage] = await Promise.all([
      lookupProcess(cnj, { movements: true, includeParties: true, includeMovementText: true }),
      djenByProcess(cnj, 50),
    ])
    const p = lookup.found ? lookup.summary : null
    const own = ownPage.ok ? ownPage.items : []

    if (!p && !own.length && !lookup.found) {
      const failure = lookupFailureMessage(lookup)
      if (failure.status !== 200) return Response.json({ error: failure.message }, { status: failure.status, headers: corsHeaders })
      return Response.json({ success: true, found: false, alias, warning: failure.message }, { headers: corsHeaders })
    }

    // O código do órgão no DJEN (idOrgao) é o que permite achar as outras decisões do juízo.
    const ownWithBody = own.find((d) => d.judgingBodyId)
    const judgingBody = ownWithBody?.judgingBody || p?.courtUnit || null
    const judgingBodyId = ownWithBody?.judgingBodyId || null
    const courtSigla = own.find((d) => d.court)?.court || court?.name || null

    let samplePage: Awaited<ReturnType<typeof djenByJudgingBody>> | null = null
    if (judgingBodyId && courtSigla) samplePage = await djenByJudgingBody(courtSigla, judgingBodyId, 120)
    const sampleAll = samplePage?.ok ? samplePage.items : []
    console.info("dna", JSON.stringify({ lookup: lookup.found ? lookup.source : lookup.reason, credits: lookup.credits, djenOwn: ownPage.ok ? own.length : (ownPage as { error?: string }).error, sampleRead: sampleAll.length }))
    const sampleDecisions = sampleAll
      .filter(isDecision)
      .filter((d) => onlyDigits(d.processNumber || "") !== cnj)
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
    const ownDecisions = own.filter(isDecision)
    const ownForReading = ownDecisions.length ? ownDecisions : own

    const reading = await readCase(argument, p, ownForReading, sampleDecisions, judgingBody)
    const sourceLabel = lookup.found ? (lookup.source === "escavador" ? "Escavador" : "DataJud/CNJ") : null
    const sources = [sourceLabel, own.length || sampleAll.length ? "DJEN/CNJ" : null].filter(Boolean).join(" + ")

    const djenStatus = !ownPage.ok
      ? ((ownPage as { error?: string }).error === "rate_limited" ? "O DJEN limitou as consultas agora; tente de novo em alguns minutos." : "O DJEN não respondeu agora.")
      : !judgingBodyId
        ? "Este processo ainda não tem publicações no DJEN; sem elas não dá para identificar o juízo e montar o dossiê."
        : samplePage && !samplePage.ok
          ? "As publicações do juízo não puderam ser lidas agora."
          : null

    return Response.json({
      success: true,
      found: true,
      alias,
      process: p ? {
        number: formatCnj(p.cnj),
        court: p.court || court?.name || "-",
        courtUnit: p.courtUnit || judgingBody || "-",
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
        court: courtSigla || "-",
        courtUnit: judgingBody || "-",
        className: own[0]?.className || "-",
        subject: "-",
      },
      decisionsAnalyzed: Math.min(ownForReading.length, 5) + Math.min(sampleDecisions.length, 10),
      decisionsFound: sampleDecisions.length,
      period: period(sampleDecisions.map((d) => d.date)),
      source: sources || "—",
      summary: reading?.summary ?? null,
      adherences: reading?.adherences ?? [],
      divergences: reading?.divergences ?? [],
      risks: reading?.risks ?? [],
      opportunities: reading?.opportunities?.length
        ? reading.opportunities
        : argument
          ? ["Confira nas decisões do juízo abaixo onde sua tese encontra apoio e onde precisa ser delimitada."]
          : ["Acrescente sua tese ou argumento para receber a leitura estratégica do caso."],
      judgePatterns: reading?.judgePatterns ?? [],
      recurringGrounds: reading?.recurringGrounds ?? [],
      dossier: {
        court: courtSigla,
        judgingBody,
        windowDays: 120,
        publicationsRead: sampleAll.length,
        decisions: sampleDecisions.length,
        outcomes: outcomeCounts(sampleDecisions),
        outcomeLabels: OUTCOME_LABEL,
        items: sampleDecisions.slice(0, 12).map(publicView),
        status: djenStatus,
      },
      processPublications: own.slice(0, 10).map(publicView),
      evidence: sampleDecisions.slice(0, 30).map((d) => ({
        id: d.id,
        processNumber: d.processNumber,
        court: d.court,
        judgingBody: d.judgingBody,
        decisionDate: d.date,
        caseClass: d.className,
        subjects: [],
        source: "djen",
        sourceUrl: d.link,
        collectedAt: new Date().toISOString(),
      })),
      warning: "Dossiê montado com publicações oficiais do DJEN (CNJ) e dados do processo. A classificação do resultado é uma leitura automática do texto — confira cada decisão. Não há previsão de resultado.",
    }, { headers: corsHeaders })
  } catch (error) {
    console.error("decision-intelligence", error instanceof Error ? error.message : String(error))
    return Response.json({ error: "Não foi possível concluir a análise." }, { status: 500, headers: corsHeaders })
  }
})
