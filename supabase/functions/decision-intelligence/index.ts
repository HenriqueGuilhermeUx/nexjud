import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { requireUser } from "../_shared/requireUser.ts"
import { courtFromCnj, formatCnj, onlyDigits } from "../_shared/cnj.ts"
import { datajudSearch } from "../_shared/datajud.ts"
import { lookupFailureMessage, lookupProcess, type ProcessSummary } from "../_shared/processData.ts"

// DNA do Juiz (versão PWA/app).
// 1) Capa, partes e movimentações do processo: Escavador (DataJud como reserva).
// 2) Processos parecidos (mesma classe e assunto): DataJud, se responder. Se falhar,
//    a análise continua sem eles — nunca derruba a tela.
// 3) Leitura da tese contra os dados do processo: OpenAI, sem percentuais nem previsão.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

// deno-lint-ignore no-explicit-any
type Any = any

async function similarProcesses(alias: string, p: ProcessSummary): Promise<{ total: number; items: Any[] }> {
  const key = Deno.env.get("DATAJUD_API_KEY") || ""
  const must: Any[] = []
  if (p.className) must.push({ match: { "classe.nome": p.className } })
  if (p.subjects[0]) must.push({ match: { "assuntos.nome": p.subjects[0] } })
  if (!key || !must.length) return { total: 0, items: [] }
  try {
    const { response } = await datajudSearch(alias, { size: 30, query: { bool: { must } } }, key)
    if (!response.ok) return { total: 0, items: [] }
    const data = await response.json()
    const items = (data?.hits?.hits || []).map((h: Any) => h?._source).filter(Boolean).map((s: Any, i: number) => {
      const movements: Any[] = Array.isArray(s?.movimentos) ? s.movimentos : []
      const decision = movements.find((m: Any) => /senten|decis|ac[oó]rd/i.test(String(m?.nome || "")))
      return {
        id: s?.id || `${alias}-${i}`,
        processNumber: s?.numeroProcesso || null,
        court: alias.toUpperCase(),
        judgingBody: s?.orgaoJulgador?.nome || null,
        decisionDate: decision?.dataHora || s?.dataHoraUltimaAtualizacao || null,
        caseClass: s?.classe?.nome || null,
        subjects: Array.isArray(s?.assuntos) ? s.assuntos.map((a: Any) => a?.nome).filter(Boolean) : [],
        source: "datajud",
        collectedAt: new Date().toISOString(),
      }
    })
    return { total: Number(data?.hits?.total?.value ?? items.length), items }
  } catch {
    return { total: 0, items: [] }
  }
}

function period(items: Any[]) {
  const dates = items.map((x) => x.decisionDate).filter(Boolean).map((x: string) => new Date(x))
    .filter((d: Date) => !Number.isNaN(d.getTime())).sort((a: Date, b: Date) => a.getTime() - b.getTime())
  if (!dates.length) return null
  const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { month: "short", year: "numeric", timeZone: "UTC" })
  return `${fmt(dates[0])} – ${fmt(dates[dates.length - 1])}`
}

type ThesisReading = { adherences: string[]; divergences: string[]; risks: string[]; opportunities: string[]; summary: string | null }

async function readThesis(argument: string, p: ProcessSummary): Promise<ThesisReading | null> {
  const key = Deno.env.get("OPENAI_API_KEY")
  if (!key || !argument) return null
  const facts = {
    tribunal: p.court, orgao: p.courtUnit, classe: p.className, assuntos: p.subjects, area: p.area,
    distribuicao: p.filingDate, valorCausa: p.causeValue, quantidadeMovimentacoes: p.movementsCount,
    movimentacoes: p.recentMovements.slice(0, 15).map((m) => ({ data: m.date, tipo: m.name, texto: m.content || undefined })),
  }
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(40_000),
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Você é um advogado brasileiro sênior. Compare a tese do usuário com os dados reais do processo. " +
              "Use só os dados fornecidos; quando faltar informação, diga o que falta. Nunca dê percentuais, chances ou previsão de resultado. " +
              "Responda em JSON com as chaves: summary (string curta), adherences, divergences, risks, opportunities (listas de frases curtas, máx. 5 cada).",
          },
          { role: "user", content: `Tese do usuário:\n${argument.slice(0, 4000)}\n\nDados do processo:\n${JSON.stringify(facts).slice(0, 9000)}` },
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

    const lookup = await lookupProcess(cnj, { movements: true, includeParties: true, includeMovementText: true })
    if (!lookup.found) {
      const failure = lookupFailureMessage(lookup)
      if (failure.status !== 200) return Response.json({ error: failure.message }, { status: failure.status, headers: corsHeaders })
      return Response.json({ success: true, found: false, alias, warning: failure.message }, { headers: corsHeaders })
    }
    const p = lookup.summary
    const argument = String(body.argument || "").trim()

    const [similar, thesis] = await Promise.all([
      alias ? similarProcesses(alias, p) : Promise.resolve({ total: 0, items: [] as Any[] }),
      readThesis(argument, p),
    ])

    const sourceLabel = lookup.source === "escavador" ? "Escavador" : "DataJud/CNJ"
    return Response.json({
      success: true,
      found: true,
      alias,
      process: {
        number: formatCnj(p.cnj),
        court: p.court || court?.name || "-",
        courtUnit: p.courtUnit || "-",
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
      },
      decisionsAnalyzed: 0,
      decisionsFound: similar.total,
      period: period(similar.items),
      source: similar.items.length ? `${sourceLabel} + DataJud (processos parecidos)` : sourceLabel,
      summary: thesis?.summary ?? null,
      adherences: thesis?.adherences ?? [],
      divergences: thesis?.divergences ?? [],
      risks: thesis?.risks ?? [],
      opportunities: thesis?.opportunities?.length
        ? thesis.opportunities
        : argument
          ? ["Confira nas movimentações recentes onde sua tese encontra apoio e onde precisa ser delimitada."]
          : ["Acrescente sua tese ou argumento para receber a leitura estratégica do caso."],
      evidence: similar.items,
      warning: "Leitura feita sobre capa e movimentações do processo, não sobre o inteiro teor das decisões. Não há previsão de resultado.",
    }, { headers: corsHeaders })
  } catch (error) {
    console.error("decision-intelligence", error instanceof Error ? error.message : String(error))
    return Response.json({ error: "Não foi possível concluir a análise." }, { status: 500, headers: corsHeaders })
  }
})
