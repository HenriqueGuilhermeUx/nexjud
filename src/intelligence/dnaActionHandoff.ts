/**
 * In-memory router handoff: no localStorage, account-bound, and no new persistence.
 * AI recommendations are provisional and must be checked against cited decisions.
 */
export type DnaActionContext = {
  source: "dna-do-juiz"
  userId: string
  caseText: string
  argument: string
  focus: string
}

function excerpt(v: unknown, max = 2000): string {
  return typeof v === "string" ? v.trim().slice(0, max) : ""
}

export function buildDnaActionContext(input: {
  userId: string | null | undefined
  facts: string
  thesis: string
  strategy: {
    strategy_summary?: unknown
    favorable_arguments?: unknown
    adverse_arguments?: unknown
    evidence_matrix?: unknown
    next_actions?: unknown
  } | null
}): DnaActionContext | null {
  if (!input.userId || !input.strategy || !excerpt(input.facts) || !excerpt(input.thesis)) return null
  const strings = (value: unknown) => Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string").map(v => excerpt(v, 450)).filter(Boolean).slice(0, 6)
    : []
  const evidence = Array.isArray(input.strategy.evidence_matrix)
    ? input.strategy.evidence_matrix.slice(0, 6).map((item: unknown) => {
      if (!item || typeof item !== "object") return ""
      const obj = item as Record<string, unknown>
      return [excerpt(obj.requirement, 180), excerpt(obj.recommended_action || obj.gap, 300)].filter(Boolean).join(": ")
    }).filter(Boolean)
    : []
  const sections = [
    ["Síntese da estratégia (IA)", excerpt(input.strategy.strategy_summary)],
    ["Argumentos a explorar", strings(input.strategy.favorable_arguments).join("; ")],
    ["Objeções e riscos", strings(input.strategy.adverse_arguments).join("; ")],
    ["Provas a reforçar", evidence.join("; ")],
    ["Próximas ações", strings(input.strategy.next_actions).join("; ")],
  ].filter((row) => row[1])
  return {
    source: "dna-do-juiz",
    userId: input.userId,
    caseText: excerpt(input.facts, 10000),
    argument: excerpt(input.thesis, 2500),
    focus: [
      "Contexto preliminar do DNA do Juiz para revisão profissional. Não afirmar que um magistrado adotará esta tese. Verificar cada decisão original e a pertinência fática antes de citar.",
      ...sections.map(([title, body]) => title + ": " + body),
    ].join("\n\n").slice(0, 10000),
  }
}

export function readDnaActionContext(value: unknown, authenticatedUserId: string | undefined): DnaActionContext | null {
  if (!authenticatedUserId || !value || typeof value !== "object") return null
  const route = value as Record<string, unknown>
  const data = route.dnaContext
  if (!data || typeof data !== "object") return null
  const context = data as Record<string, unknown>
  if (context.source !== "dna-do-juiz" || context.userId !== authenticatedUserId ||
      typeof context.caseText !== "string" || typeof context.argument !== "string" ||
      typeof context.focus !== "string") return null
  return {
    source: "dna-do-juiz", userId: authenticatedUserId,
    caseText: context.caseText.slice(0, 10000),
    argument: context.argument.slice(0, 2500),
    focus: context.focus.slice(0, 10000),
  }
}

type DossierRef = { date?: string | null; kindLabel?: string; kind?: string; outcomeLabel?: string | null; processNumber?: string | null; excerpt?: string; link?: string | null }

/**
 * Leva o dossiê do juízo para o gerador de peças: fatos do processo, tese escolhida e
 * decisões reais da mesma vara (com link) para a IA citar — nada inventado.
 */
export function buildDossierDraftContext(input: {
  userId: string | null | undefined
  thesis: string
  result: {
    process?: Record<string, unknown> | null
    summary?: unknown
    judgePatterns?: unknown
    recurringGrounds?: unknown
    dossier?: { judgingBody?: unknown; items?: unknown } | null
    processPublications?: unknown
  } | null
}): DnaActionContext | null {
  if (!input.userId || !input.result || !excerpt(input.thesis)) return null
  const p = (input.result.process || {}) as Record<string, unknown>
  const strings = (value: unknown, max = 300) => Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string").map(v => excerpt(v, max)).filter(Boolean).slice(0, 6)
    : []
  const refs = (value: unknown, max: number) => Array.isArray(value)
    ? (value as DossierRef[]).slice(0, max).map((d) => [
      [d.kindLabel, d.outcomeLabel, d.date ? String(d.date).slice(0, 10) : "", d.processNumber].filter(Boolean).join(" · "),
      excerpt(d.excerpt, 380),
      d.link ? `Fonte: ${d.link}` : "",
    ].filter(Boolean).join("\n"))
    : []
  const facts = [
    `Processo ${excerpt(p.number, 40)} — ${excerpt(p.court, 40)} — ${excerpt(p.courtUnit, 160)}`,
    `Classe: ${excerpt(p.className, 160)}. Assunto: ${excerpt(p.subject, 300)}.`,
    p.activeSide || p.passiveSide ? `Partes: ${excerpt(p.activeSide, 200)} x ${excerpt(p.passiveSide, 200)}.` : "",
    p.causeValue ? `Valor da causa: ${excerpt(p.causeValue, 40)}.` : "",
    excerpt(input.result.summary, 1200),
    ...refs(input.result.processPublications, 4).map((r) => `Publicação do processo:\n${r}`),
  ].filter(Boolean).join("\n\n")
  const judgingBody = excerpt(input.result.dossier?.judgingBody, 160)
  return {
    source: "dna-do-juiz",
    userId: input.userId,
    caseText: facts.slice(0, 10000),
    argument: excerpt(input.thesis, 2500),
    focus: [
      `Tese escolhida: ${excerpt(input.thesis, 2500)}`,
      "Use como apoio apenas as decisões reais abaixo, do mesmo juízo, citando data e número do processo e indicando a fonte. Não invente jurisprudência. Não afirme que o magistrado adotará a tese.",
      judgingBody ? `Juízo: ${judgingBody}` : "",
      strings(input.result.judgePatterns).length ? `Padrões observados no juízo: ${strings(input.result.judgePatterns).join("; ")}` : "",
      strings(input.result.recurringGrounds).length ? `Fundamentos que se repetem: ${strings(input.result.recurringGrounds).join("; ")}` : "",
      ...refs(input.result.dossier?.items, 6).map((r) => `Decisão do juízo:\n${r}`),
    ].filter(Boolean).join("\n\n").slice(0, 10000),
  }
}
