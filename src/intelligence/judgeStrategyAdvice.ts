import type { DecisionEvidenceAudit } from "./decisionEvidenceAudit"

export type JudgeStrategyAction = {
  title: string
  recommendation: string
  rationale: string
  references: Array<{ id: string; document: string; sourceUrl: string | null }>
}

export type JudgeStrategyAdvice = {
  coverage: "insufficient" | "documented"
  scope: "insufficient" | "judging_body" | "named_magistrate"
  sourceCount: number
  headline: string
  disclaimer: string
  actions: JudgeStrategyAction[]
}

/**
 * Evidence-bound strategy checklist. Does not profile judge personality or infer
 * the outcome of pending cases. The originating decision must be reviewable.
 */
export function buildJudgeStrategyAdvice(
  audit: DecisionEvidenceAudit,
  caseFacts: string,
  counselThesis: string,
  judgeName = "",
): JudgeStrategyAdvice {
  // Only attribute documentary history to a named magistrate when the source identifies that person.
  const normalizedJudge = judgeName.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR")
  const comparable = normalizedJudge
    ? audit.comparableEvidence.filter(item => item.judgeOrRapporteur?.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR") === normalizedJudge)
    : audit.comparableEvidence
  const eligibleIds = new Set(comparable.map(item => item.id))
  const review = audit.review.filter(item => item.comparable && eligibleIds.has(item.id))
  const cite = (item: typeof review[number]) => ({
    id: item.id,
    document: item.documentReference || item.processNumber || item.id,
    sourceUrl: item.sourceUrl,
  })
  const disclaimer = "Orientação para revisão do advogado, não previsão do comportamento individual do magistrado. Avalie diferenças fáticas, atualidade, recursos e eventuais mudanças de entendimento."

  if (comparable.length === 0) {
    return {
      coverage: "insufficient",
      scope: "insufficient",
      sourceCount: 0,
      headline: normalizedJudge
        ? "Ainda não há decisões fundamentadas atribuídas ao magistrado informado para orientar estratégia individual."
        : "Ainda não há decisões fundamentadas comparáveis deste órgão para orientar a estratégia específica.",
      disclaimer,
      actions: [
        {
          title: "Antes de escolher a tese",
          recommendation: "Localize decisões do mesmo órgão com inteiro teor, resultado e identificação documental; não use movimentações do DataJud como fundamento decisório.",
          rationale: "A consulta atual não contém fundamentações verificáveis do juízo que possam sustentar uma orientação específica.",
          references: [],
        },
        {
          title: "Avaliar se vale ajuizar, negociar ou reformular",
          recommendation: "Revise os requisitos do pedido, a qualidade da prova, riscos de prescrição, precedentes vinculantes e custos. Não conclua que este juiz acolherá ou rejeitará a tese sem decisões verificáveis.",
          rationale: "Viabilidade processual e financeira não pode ser inferida de metadados de movimentação.",
          references: [],
        },
      ],
    }
  }

  const fullFacts = caseFacts.trim()
  const thesis = counselThesis.trim()
  const supported = comparable.flatMap((item) => {
    const source = review.find(row => row.id === item.id && row.comparable)
    if (!source) return []
    const reasoning = item.reasoning.map(text => text.trim()).find(Boolean)
    // Skip ungrounded entries rather than letting them consume the first eight slots.
    if (!reasoning || !item.observedOutcome?.trim() || !source.sourceUrl && !source.documentReference) return []
    return [{
      source,
      reasoning: reasoning.slice(0, 420),
      outcome: item.observedOutcome?.trim().slice(0, 220) || "Não especificado",
      theses: item.legalTheses.filter(Boolean).slice(0, 2),
    }]
  })
  const usable = supported.slice(0, 5)
  // The comparison is descriptive: a small set cannot establish an individual pattern.
  if (usable.length === 0) {
    return {
      coverage: "insufficient", scope: "insufficient", sourceCount: 0,
      headline: "Os registros comparáveis ainda não oferecem fundamentação documentada para recomendar argumentos.",
      disclaimer,
      actions: [{
        title: "Conferir inteiro teor",
        recommendation: "Localize a fundamentação, o resultado e a autoria no documento judicial antes de elaborar a estratégia.",
        rationale: "Metadados ou referências sem fundamentos utilizáveis não sustentam uma orientação individual.",
        references: [],
      }],
    }
  }
  const selected = usable.map(row => cite(row.source))

  const argumentsAction: JudgeStrategyAction = {
    title: "Argumentos a confrontar com as decisões deste órgão",
    recommendation: usable.map((row, i) =>
      `${i + 1}. Fundamento documentado: “${row.reasoning}” — resultado registrado: “${row.outcome}”. ${row.theses.length ? `Tese mencionada: ${row.theses.join("; ")}.` : "Conferir a tese jurídica no documento original."}`
    ).join("\n\n"),
    rationale: "São trechos reais registrados na base auditada, não argumentos automaticamente classificados como vencedores. Leia o inteiro teor para verificar em que fatos e pedidos cada fundamento foi aplicado.",
    references: selected,
  }

  const reformAction: JudgeStrategyAction = {
    title: "Reformular a peça para enfrentar fundamentos relevantes",
    recommendation: thesis
      ? "Compare sua tese com cada fundamento citado: explicite semelhanças e diferenças dos fatos, discuta precedentes contrários e reformule pedidos ou fundamentos insuficientemente demonstrados. A análise textual não confirma concordância do juiz com a sua tese."
      : "Cole sua tese ou trecho da petição no campo de argumento e confronte cada fundamento documentado com os fatos do seu caso. Identifique possíveis distinguishing e contra-argumentos.",
    rationale: fullFacts
      ? "Os fatos do caso foram informados, mas a adequação jurídica a cada decisão exige confronto cuidadoso pelo advogado."
      : "Ainda faltam fatos detalhados do caso para verificar aderência factual às decisões.",
    references: selected,
  }

  const viabilityAction: JudgeStrategyAction = {
    title: "Prosseguir, negociar ou alterar a estratégia?",
    recommendation: "Antes de optar, confronte (1) provas disponíveis e prova faltante, (2) fundamentos e resultados das decisões anexadas, (3) precedentes vinculantes e possíveis recursos, (4) prazo, custo e benefício econômico. Se os documentos contradizem a tese sem distinção material, considere reformulá-la ou avaliar composição; se houver distinção e provas sólidas, documente-as antes de prosseguir.",
    rationale: "O histórico do órgão é um insumo contextual, não uma decisão automática de ajuizamento, acordo ou desistência.",
    references: selected,
  }

  return {
    coverage: "documented",
    scope: normalizedJudge ? "named_magistrate" : "judging_body",
    sourceCount: usable.length,
    headline: normalizedJudge
      ? `Foram utilizados ${usable.length} documentos fundamentados atribuídos ao magistrado informado. ${usable.length < 3 ? "A amostra é reduzida e não representa um padrão individual." : "A amostra não garante um padrão individual."} Revise os fundamentos antes de escolher uma linha de atuação.`
      : `Foram utilizados ${usable.length} documentos fundamentados do órgão informado. ${usable.length < 3 ? "A amostra é reduzida." : "A quantidade não comprova um padrão decisório."} Revise os fundamentos antes de escolher uma linha de atuação.`,
    disclaimer,
    actions: [argumentsAction, reformAction, viabilityAction],
  }
}
