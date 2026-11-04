import type { DecisionEvidenceAudit } from "./decisionEvidenceAudit"
import type { ObservedDecisionPattern } from "./decisionPattern"

export type PredictiveReadiness = "sem_base" | "base_documentada" | "padrao_exploratorio"

export type PredictiveReadinessSummary = {
  status: PredictiveReadiness
  label: string
  explanation: string
  nextActions: string[]
}

/**
 * Exploratory readiness, NOT a probability, prediction, or validation of a judicial outcome.
 * A document with source and outcome is still not sufficient to train/calibrate a model.
 */
export function assessPredictiveReadiness(audit: DecisionEvidenceAudit): PredictiveReadinessSummary {
  const actions = audit.gaps
    .filter(gap => gap.count > 0)
    .map(gap => gap.guidance)
    .filter((value, index, all) => all.indexOf(value) === index)
    .slice(0, 5)

  if (audit.enoughForDescriptivePattern) {
    return {
      status: "padrao_exploratorio",
      label: "Padrão exploratório disponível",
      explanation: "Há decisões documentadas do mesmo órgão para descrever ocorrências. A amostra não é calibrada nem representativa e não autoriza estimar chance de êxito.",
      nextActions: [
        "Conferir inteiro teor, resultado e pertinência fática de cada decisão antes de utilizar o padrão.",
        ...actions,
      ],
    }
  }
  if (audit.qualifiedDecisions > 0) {
    return {
      status: "base_documentada",
      label: "Decisões documentadas, comparação insuficiente",
      explanation: "Foram encontradas decisões com dados verificáveis, mas faltam decisões comparáveis suficientes do mesmo órgão para qualquer síntese exploratória.",
      nextActions: [
        "Localizar decisões adicionais do mesmo tribunal e órgão julgador, com fundamento e resultado verificáveis.",
        ...actions,
      ],
    }
  }
  return {
    status: "sem_base",
    label: "Sem base decisória documentada suficiente",
    explanation: "Metadados e movimentações processuais não demonstram o conteúdo ou o resultado de uma decisão. Nenhuma probabilidade de êxito foi estimada.",
    nextActions: [
      "Obter o inteiro teor de decisões públicas e confirmar seus identificadores documentais.",
      ...actions,
    ],
  }
}

function clean(value: unknown): string {
  // Prevent spreadsheet formula injection if users copy this plain-text dossier into spreadsheets.
  const text = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim()
  return /^[=+@-]\s*\w/.test(text) ? "'" + text : text
}

export function buildPredictiveEvidenceDossier(input: {
  processNumber: string
  court: string
  judgingBody: string
  caseDescription?: string
  argument?: string
  audit: DecisionEvidenceAudit
  pattern?: ObservedDecisionPattern | null
  generatedAt: string
}): string {
  const { audit, pattern } = input
  const readiness = assessPredictiveReadiness(audit)
  const line = (label: string, value: unknown) => `${label}: ${clean(value)}`
  return [
    "NEXJUD — DOSSIÊ DE EVIDÊNCIAS DECISÓRIAS",
    "Relatório descritivo para revisão profissional; não constitui previsão de resultado.",
    line("Emissão", input.generatedAt),
    line("Processo", input.processNumber),
    line("Tribunal", input.court),
    line("Órgão julgador", input.judgingBody),
    line("Resumo informado", input.caseDescription || "Não informado"),
    line("Tese informada", input.argument || "Não informada"),
    "",
    "PRONTIDÃO DA BASE",
    readiness.label,
    readiness.explanation,
    line("Registros recebidos", audit.recordsReceived),
    line("Registros distintos", audit.distinctRecords),
    line("Duplicatas excluídas", audit.duplicateRecords),
    line("Decisões documentadas", audit.qualifiedDecisions),
    line("Decisões comparáveis ao juízo", audit.comparableDecisions),
    line("Período comparável", audit.period || "Não identificado"),
    "",
    "LACUNAS E PRÓXIMOS PASSOS",
    ...audit.gaps.map(gap => `- ${clean(gap.label)} (${gap.count}): ${clean(gap.guidance)}`),
    ...readiness.nextActions.map(action => `- Próximo passo: ${clean(action)}`),
    "",
    "PADRÕES DESCRITIVOS VERIFICÁVEIS",
    ...(!pattern ? ["Sem padrão exploratório sustentado por decisões comparáveis."] : [
      ...pattern.recurringTheses.map(item => `- Tese registrada: ${clean(item.label)} (${item.count})`),
      ...pattern.observedOutcomes.map(item => `- Resultado observado: ${clean(item.label)} (${item.count})`),
      ...pattern.recurringPrecedents.map(item => `- Precedente citado: ${clean(item.label)} (${item.count})`),
    ]),
    "",
    "REGISTROS, ORIGEM E EXCLUSÕES",
    ...audit.review.flatMap((item, index) => [
      `#${index + 1} ${clean(item.processNumber || item.id)}`,
      line("Origem", item.source),
      line("Tribunal", item.court),
      line("Órgão julgador", item.judgingBody || "Não identificado"),
      line("Documento", item.documentReference || "Não identificado"),
      line("Data decisória", item.decisionDate || "Não identificada"),
      line("Referência pública", item.sourceUrl || "Não informada"),
      line("Qualificada", item.qualified ? "Sim" : "Não"),
      line("Comparável", item.comparable ? "Sim" : "Não"),
      line("Motivos de exclusão", item.exclusionReasons.join("; ") || "Nenhum identificado"),
      "",
    ]),
    "LIMITAÇÕES",
    "Não foram calculadas probabilidade de êxito, risco estatístico, tendência de juiz ou previsão de acordo.",
    "Resultados e teses listados refletem apenas os documentos disponíveis e precisam ser conferidos pelo advogado.",
    "Dados DataJud de movimentação não são sentenças ou acórdãos com inteiro teor.",
    "Um padrão exploratório não substitui validação externa, estudo de representatividade ou calibração.",
  ].join("\n")
}
