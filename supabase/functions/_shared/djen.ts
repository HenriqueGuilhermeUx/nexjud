// DJEN — Diário de Justiça Eletrônico Nacional (CNJ), API pública de comunicações.
// GET https://comunicaapi.pje.jus.br/api/v1/comunicacao (sem chave).
// Filtros usados: numeroProcesso, siglaTribunal, nomeOrgao, dataDisponibilizacaoInicio/Fim,
// pagina, itensPorPagina. O CNJ limita requisições por janela (X-RateLimit-Limit ≈ 20):
// cada análise faz no máximo 3 chamadas e nunca repete após HTTP 429.
//
// Se a chamada direta do Supabase for recusada, e DJEN_PROXY_SECRET estiver configurado,
// tenta pela função netlify/functions/djen-proxy.mjs (mesma consulta, outra rede de saída).

const BASE = "https://comunicaapi.pje.jus.br/api/v1/comunicacao"
const DEFAULT_PROXY_URL = "https://nexjudsolucoes.com.br/api/djen-proxy"
const TIMEOUT_MS = 15_000
const MAX_TEXT = 6_000

export type DjenKind = "sentenca" | "acordao" | "decisao" | "despacho" | "outro"
export type DjenOutcome = "procedente" | "parcialmente_procedente" | "improcedente" | "extinto_sem_merito" | "homologacao" | "deferido" | "indeferido" | null

export type DjenPublication = {
  id: string
  date: string | null
  court: string | null
  judgingBody: string | null
  processNumber: string | null
  className: string | null
  communicationType: string | null
  documentType: string | null
  kind: DjenKind
  outcome: DjenOutcome
  text: string
  link: string | null
}

export type DjenPage =
  | { ok: true; count: number; items: DjenPublication[]; via: "direct" | "netlify" }
  | { ok: false; error: "rate_limited" | "blocked" | "unavailable" | "timeout" | "bad_format"; status?: number }

// deno-lint-ignore no-explicit-any
type Any = any

export function cleanText(html: string): string {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/[ \t ]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim()
}

export function classifyKind(documentType: string, text: string): DjenKind {
  const head = `${documentType} ${text.slice(0, 400)}`.toLocaleLowerCase("pt-BR")
  if (/senten[çc]a/.test(head)) return "sentenca"
  if (/ac[óo]rd[ãa]o|ementa/.test(head)) return "acordao"
  if (/decis[ãa]o/.test(head)) return "decisao"
  if (/despacho|ato ordinat[óo]rio/.test(head)) return "despacho"
  const body = text.toLocaleLowerCase("pt-BR")
  if (/julgo (parcialmente )?(im)?procedente|julgo extint/.test(body)) return "sentenca"
  if (/\b(defiro|indefiro)\b/.test(body)) return "decisao"
  return "outro"
}

/** Leitura automática do dispositivo. Serve para contar, não para prever. */
export function detectOutcome(text: string): DjenOutcome {
  const t = text.toLocaleLowerCase("pt-BR").replace(/\s+/g, " ")
  if (/julgo parcialmente procedente|julgo procedente(s)? em parte|parcialmente procedente(s)? o(s)? pedido/.test(t)) return "parcialmente_procedente"
  if (/julgo improcedente|julgo improcedentes|improcedente(s)? o(s)? pedido/.test(t)) return "improcedente"
  if (/julgo procedente|julgo procedentes|procedente(s)? o(s)? pedido/.test(t)) return "procedente"
  if (/extin(to|ta|go) o (processo|feito)[^.]{0,80}sem (resolu|julgamento)|art\.? ?485/.test(t)) return "extinto_sem_merito"
  if (/homologo/.test(t)) return "homologacao"
  if (/\bindefiro\b/.test(t)) return "indeferido"
  if (/\bdefiro\b/.test(t)) return "deferido"
  return null
}

export function normalizeItem(record: Any): DjenPublication | null {
  if (!record || typeof record !== "object") return null
  const id = String(record.hash || record.id || "").slice(0, 120)
  if (!id) return null
  const text = cleanText(record.texto || "").slice(0, MAX_TEXT)
  const documentType = String(record.tipoDocumento || record.tipo_documento || "").slice(0, 90)
  let link: string | null = null
  try {
    const u = new URL(String(record.link || ""))
    if (u.protocol === "https:" && /(?:^|\.)jus\.br$/i.test(u.hostname)) link = u.href
  } catch { /* sem link válido */ }
  const kind = classifyKind(documentType, text)
  return {
    id,
    date: String(record.data_disponibilizacao || record.dataDisponibilizacao || "").slice(0, 32) || null,
    court: String(record.siglaTribunal || record.sigla_tribunal || "").slice(0, 18) || null,
    judgingBody: String(record.nomeOrgao || record.nome_orgao || "").slice(0, 160) || null,
    processNumber: String(record.numeroprocessocommascara || record.numero_processo || "").slice(0, 32) || null,
    className: String(record.nomeClasse || record.nome_classe || "").slice(0, 120) || null,
    communicationType: String(record.tipoComunicacao || record.tipo_comunicacao || "").slice(0, 90) || null,
    documentType: documentType || null,
    kind,
    outcome: kind === "sentenca" || kind === "acordao" || kind === "decisao" ? detectOutcome(text) : null,
    text,
    link,
  }
}

function sameBody(a: string | null, b: string | null) {
  const norm = (v: string | null) => String(v || "").toLocaleLowerCase("pt-BR").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim()
  return Boolean(a && b) && norm(a) === norm(b)
}

async function request(params: Record<string, string>): Promise<DjenPage> {
  const url = new URL(BASE)
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v)

  const parse = async (response: Response, via: "direct" | "netlify"): Promise<DjenPage> => {
    if (response.status === 429) return { ok: false, error: "rate_limited", status: 429 }
    if (!response.ok) return { ok: false, error: response.status === 403 ? "blocked" : "unavailable", status: response.status }
    try {
      const data = await response.json()
      if (!Array.isArray(data?.items)) return { ok: false, error: "bad_format" }
      const items = data.items.slice(0, 100).map(normalizeItem).filter(Boolean) as DjenPublication[]
      return { ok: true, count: Number(data.count ?? items.length) || items.length, items, via }
    } catch {
      return { ok: false, error: "bad_format" }
    }
  }

  let direct: DjenPage
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "NexJud/1.0 (consulta sob demanda)" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    direct = await parse(response, "direct")
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError"
    direct = { ok: false, error: timedOut ? "timeout" : "unavailable" }
  }
  if (direct.ok || direct.error === "rate_limited" || direct.error === "bad_format") return direct

  const secret = Deno.env.get("DJEN_PROXY_SECRET") || ""
  if (!secret) return direct
  try {
    const response = await fetch(Deno.env.get("DJEN_PROXY_URL") || DEFAULT_PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-nexjud-proxy-secret": secret },
      body: JSON.stringify({ params }),
      signal: AbortSignal.timeout(TIMEOUT_MS + 5_000),
    })
    if (response.headers.get("x-djen-via") !== "netlify") return direct
    return await parse(response, "netlify")
  } catch {
    return direct
  }
}

/** Publicações de um processo (mais recentes primeiro). */
export async function djenByProcess(cnjDigits: string, limit = 30): Promise<DjenPage> {
  const page = await request({ numeroProcesso: cnjDigits, pagina: "1", itensPorPagina: String(Math.min(limit, 100)) })
  if (!page.ok) return page
  const digits = (v: string | null) => String(v || "").replace(/\D/g, "")
  const items = page.items
    .filter((i) => digits(i.processNumber) === cnjDigits)
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
  return { ...page, items }
}

/**
 * Amostra recente de decisões do mesmo juízo (vara, câmara ou turma).
 * Filtra de novo pelo nome exato do órgão: a resposta pode trazer outros órgãos.
 */
export async function djenByJudgingBody(court: string, judgingBody: string, days = 120, pages = 2): Promise<DjenPage & { pagesRead?: number }> {
  const end = new Date()
  const start = new Date(end.getTime() - days * 86_400_000)
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  const collected: DjenPublication[] = []
  let count = 0
  let via: "direct" | "netlify" = "direct"
  let pagesRead = 0
  for (let p = 1; p <= pages; p++) {
    const page = await request({
      siglaTribunal: court,
      nomeOrgao: judgingBody,
      dataDisponibilizacaoInicio: iso(start),
      dataDisponibilizacaoFim: iso(end),
      pagina: String(p),
      itensPorPagina: "100",
    })
    if (!page.ok) {
      if (p === 1) return page
      break
    }
    pagesRead++
    via = page.via
    count = page.count
    collected.push(...page.items.filter((i) => sameBody(i.judgingBody, judgingBody)))
    if (page.items.length < 100) break
  }
  const seen = new Set<string>()
  const items = collected.filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)))
  return { ok: true, count, items, via, pagesRead }
}

export function isDecision(p: DjenPublication) {
  return p.kind === "sentenca" || p.kind === "acordao" || p.kind === "decisao"
}

export function outcomeCounts(items: DjenPublication[]) {
  const counts: Record<string, number> = {}
  for (const i of items) if (i.outcome) counts[i.outcome] = (counts[i.outcome] || 0) + 1
  return counts
}
