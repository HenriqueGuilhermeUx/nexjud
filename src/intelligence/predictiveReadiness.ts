import type { JudicialDecisionEvidence } from "./judicialDecisionSchema"
import { assessEvidenceQuality } from "./evidenceQuality"
import { hasTraceableSource } from "./provenance"

/**
 * Gate conservador para treinamento/avaliação de predição jurídica.
 * Isto NÃO é um modelo preditivo nem autoriza exibir probabilidade de êxito.
 */
export interface PredictiveReadiness {
  eligible: boolean
  uniqueDecisions: number
  eligibleDecisions: number
  withKnownOutcome: number
  reasons: string[]
  disclaimer: string
}

export function assessPredictiveReadiness(items: JudicialDecisionEvidence[], minimum = 100): PredictiveReadiness {
  const unique = new Map<string, JudicialDecisionEvidence>()
  for (const item of items) {
    const key = item.sourceDocumentId || item.contentHash || item.id
    if (key && !unique.has(key)) unique.set(key, item)
  }
  const distinct = [...unique.values()]
  const qualified = distinct.filter(item =>
    hasTraceableSource(item) &&
    assessEvidenceQuality(item).score >= 80 &&
    Boolean(item.decisionDate && item.caseClass && item.judgingBody && item.reasoning.length && item.observedOutcome)
  )
  const reasons: string[] = []
  if (qualified.length < minimum) reasons.push(`Amostra qualificada insuficiente: ${qualified.length} de ${minimum} decisões mínimas para iniciar avaliação.`)
  if (!qualified.length) reasons.push("Não há decisões com resultado e fundamentação verificáveis.")
  reasons.push("Mesmo com amostra suficiente, é obrigatório validar separação temporal, representatividade, calibração, viés e desempenho fora da amostra antes de exibir probabilidades.")
  return {
    eligible: false,
    uniqueDecisions: distinct.length,
    eligibleDecisions: qualified.length,
    withKnownOutcome: qualified.filter(item => Boolean(item.observedOutcome)).length,
    reasons,
    disclaimer: "Não existe previsão estatística validada nesta avaliação. Frequências observadas não equivalem a chances de vitória.",
  }
}
