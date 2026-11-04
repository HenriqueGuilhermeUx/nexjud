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
