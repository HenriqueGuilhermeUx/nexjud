// Dados de um processo pelo número CNJ, num formato único para todo o NexJud.
//
// Fonte principal: Escavador (licença comercial por contrato).
// Reserva: DataJud (API pública; uso comercial vedado pela Portaria CNJ 374/2026,
// por isso só é usado se o Escavador não estiver disponível).
import { courtFromCnj, formatCnj, onlyDigits } from "./cnj.ts"
import { datajudSearch } from "./datajud.ts"
import { escavadorConfigured, escavadorGet } from "./escavador.ts"

export type ProcessMovement = { date: string | null; name: string; content?: string | null }

export type ProcessSummary = {
  cnj: string
  court: string
  courtUnit: string | null
  className: string | null
  subjects: string[]
  area: string | null
  filingDate: string | null
  lastMovementDate: string | null
  movementsCount: number
  causeValue: string | null
  restricted: boolean
  archived: boolean | null
  // Só para usuários logados (nunca na consulta grátis):
  activeSide?: string | null
  passiveSide?: string | null
  parties?: { name: string | null; side: string | null; role: string | null }[]
  sourceUrl?: string | null
  recentMovements: ProcessMovement[]
}

export type ProcessLookup =
  | { found: true; source: "escavador" | "datajud"; summary: ProcessSummary; credits: number }
  | { found: false; source: "escavador" | "datajud" | "none"; reason: string; credits: number }

export type LookupOptions = {
  /** Busca também as movimentações (custa mais uma chamada ao Escavador). */
  movements?: boolean
  /** Inclui partes e títulos dos polos. Não usar em telas públicas. */
  includeParties?: boolean
  /** Inclui o texto das movimentações (pode conter nomes). Não usar em telas públicas. */
  includeMovementText?: boolean
  /** Chave/Authorization do DataJud para a reserva. */
  datajudAuthorization?: string
}

// deno-lint-ignore no-explicit-any
type Any = any

function mainSource(process: Any): Any {
  const sources: Any[] = Array.isArray(process?.fontes) ? process.fontes : []
  const courts = sources.filter((s) => String(s?.tipo || "").toUpperCase() === "TRIBUNAL")
  const pool = courts.length ? courts : sources
  return [...pool].sort((a, b) => Number(b?.quantidade_movimentacoes || 0) - Number(a?.quantidade_movimentacoes || 0))[0] || null
}

function fromEscavador(cnj: string, process: Any, movements: Any[], options: LookupOptions): ProcessSummary {
  const source = mainSource(process)
  const capa = source?.capa || {}
  const normalized: string[] = Array.isArray(capa.assuntos_normalizados)
    ? capa.assuntos_normalizados.map((a: Any) => a?.nome).filter(Boolean)
    : []
  const subjects: string[] = normalized.length
    ? normalized
    : [capa.assunto_principal_normalizado?.nome, capa.assunto].filter(Boolean).map(String)
  const restricted = Boolean(source?.segredo_justica)
  const summary: ProcessSummary = {
    cnj: formatCnj(process?.numero_cnj || cnj),
    court: source?.tribunal?.sigla || source?.sigla || courtFromCnj(cnj)?.name || "",
    courtUnit: capa.orgao_julgador || null,
    className: capa.classe_normalizada?.nome || capa.classe || null,
    subjects,
    area: capa.area || null,
    filingDate: capa.data_distribuicao || process?.data_inicio || null,
    lastMovementDate: process?.data_ultima_movimentacao || source?.data_ultima_movimentacao || null,
    movementsCount: Number(process?.quantidade_movimentacoes || source?.quantidade_movimentacoes || 0),
    causeValue: capa.valor_causa?.valor_formatado || null,
    restricted,
    archived: source?.arquivado ?? null,
    recentMovements: movements.slice(0, 20).map((m: Any) => ({
      date: m?.data || null,
      name: m?.classificacao_predita?.nome || m?.tipo || "Movimentação",
      content: options.includeMovementText ? String(m?.conteudo || "").slice(0, 600) || null : undefined,
    })),
  }
  if (options.includeParties && !restricted) {
    summary.activeSide = process?.titulo_polo_ativo || null
    summary.passiveSide = process?.titulo_polo_passivo || null
    summary.sourceUrl = source?.url || null
    const people: Any[] = Array.isArray(source?.envolvidos) ? source.envolvidos : []
    summary.parties = people.slice(0, 30).map((p) => ({ name: p?.nome || null, side: p?.polo || null, role: p?.tipo_normalizado || p?.tipo || null }))
  }
  return summary
}

function fromDatajud(cnj: string, source: Any, options: LookupOptions): ProcessSummary {
  const movements: Any[] = [...(Array.isArray(source?.movimentos) ? source.movimentos : [])]
    .sort((a, b) => String(b?.dataHora || "").localeCompare(String(a?.dataHora || "")))
  return {
    cnj: formatCnj(cnj),
    court: courtFromCnj(cnj)?.name || source?.tribunal || "",
    courtUnit: source?.orgaoJulgador?.nome || null,
    className: source?.classe?.nome || null,
    subjects: Array.isArray(source?.assuntos) ? source.assuntos.map((a: Any) => a?.nome).filter(Boolean) : [],
    area: null,
    filingDate: source?.dataAjuizamento || null,
    lastMovementDate: movements[0]?.dataHora || null,
    movementsCount: movements.length,
    causeValue: null,
    restricted: Number(source?.nivelSigilo || 0) > 0,
    archived: null,
    recentMovements: options.movements === false ? [] : movements.slice(0, 20).map((m: Any) => ({ date: m?.dataHora || null, name: m?.nome || "Movimentação" })),
  }
}

export async function lookupProcess(cnjInput: string, options: LookupOptions = {}): Promise<ProcessLookup> {
  const cnj = onlyDigits(cnjInput)
  let credits = 0
  let escavadorReason = "escavador_not_configured"

  if (escavadorConfigured()) {
    const capa = await escavadorGet<Any>(`/processos/numero_cnj/${formatCnj(cnj)}`)
    credits += capa.credits
    if (capa.ok) {
      let movements: Any[] = []
      if (options.movements) {
        const list = await escavadorGet<Any>(`/processos/numero_cnj/${formatCnj(cnj)}/movimentacoes`, { limit: 20, ordem: "desc" })
        credits += list.credits
        if (list.ok && Array.isArray(list.data?.items)) movements = list.data.items
      }
      return { found: true, source: "escavador", summary: fromEscavador(cnj, capa.data, movements, options), credits }
    }
    escavadorReason = capa.error
    // 404 = o Escavador não tem o processo; tenta o DataJud. 402/401/5xx = problema da conta ou do serviço.
  }

  const court = courtFromCnj(cnj)
  const authorization = options.datajudAuthorization || Deno.env.get("DATAJUD_API_KEY") || ""
  if (!court || !authorization) return { found: false, source: "none", reason: escavadorReason, credits }
  try {
    const { response } = await datajudSearch(court.alias, { size: 1, query: { match: { numeroProcesso: cnj } } }, authorization)
    if (!response.ok) return { found: false, source: "datajud", reason: `datajud_${response.status}|${escavadorReason}`, credits }
    const data = await response.json()
    const source = data?.hits?.hits?.[0]?._source
    if (!source) return { found: false, source: escavadorReason === "escavador_404" ? "escavador" : "datajud", reason: "not_found", credits }
    return { found: true, source: "datajud", summary: fromDatajud(cnj, source, options), credits }
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError"
    return { found: false, source: "datajud", reason: `${timedOut ? "datajud_timeout" : "datajud_error"}|${escavadorReason}`, credits }
  }
}

/** Mensagem para o usuário quando a busca não encontra ou falha. */
export function lookupFailureMessage(lookup: Extract<ProcessLookup, { found: false }>): { status: number; message: string } {
  if (lookup.reason === "not_found") {
    return { status: 200, message: "Processo não encontrado nas bases consultadas. Processos muito recentes ou em segredo de justiça podem não aparecer." }
  }
  return { status: 503, message: "As bases de processos não responderam agora. Tente de novo em alguns minutos." }
}
