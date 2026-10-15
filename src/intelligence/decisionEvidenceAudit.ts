import type { JudicialDecisionEvidence } from "./judicialDecisionSchema"
import { assessEvidenceQuality } from "./evidenceQuality"
import { hasTraceableSource } from "./provenance"

/**
 * Descriptive-only decision evidence audit. The returned review list is
 * source metadata, never a prediction or automatic case/argument comparison.
 */
export type EvidenceGap = {
  label: string
  count: number
  guidance: string
}
export type DecisionEvidenceAudit = {
  recordsReceived: number
  distinctRecords: number
  duplicateRecords: number
  qualifiedDecisions: number
  comparableDecisions: number
  enoughForDescriptivePattern: boolean
  period: string | null
  gaps: EvidenceGap[]
  review: Array<{
    id: string
    court: string
    judgingBody: string | null
    processNumber: string | null
    source: string
    documentReference: string | null
    decisionDate: string | null
    qualified: boolean
  }>
  comparableEvidence: JudicialDecisionEvidence[]
}

function venueText(value: string | undefined): string {
  return (value || "").normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR")
}

function validDecisionDate(value: string | undefined): boolean {
  // A filing date or malformed timestamp must not become an inferred decision date.
  return Boolean(value && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value) &&
    Number.isFinite(Date.parse(value)) && !Number.isNaN(new Date(value).getTime()))
}

export function auditDecisionEvidence(
  records: readonly JudicialDecisionEvidence[],
  target: { court?: string; judgingBody?: string },
): DecisionEvidenceAudit {
  const seen = new Set<string>()
  const distinct: JudicialDecisionEvidence[] = []
  let duplicates = 0
  for (const record of records) {
    const key = `${record.source}:${venueText(record.court)}:${record.sourceDocumentId?.trim() || record.id?.trim() || ""}`
    if (key.endsWith(":") || seen.has(key)) {
      duplicates += 1
      continue
    }
    seen.add(key)
    distinct.push(record)
  }

  const counters = {
    reasoning: 0, outcome: 0, date: 0, traceability: 0,
    quality: 0, court: 0, judgingBody: 0,
  }
  const qualified: JudicialDecisionEvidence[] = []
  const comparable: JudicialDecisionEvidence[] = []
  for (const record of distinct) {
    const completeReasoning = record.reasoning.some(reason => Boolean(reason.trim()))
    const hasOutcome = Boolean(record.observedOutcome?.trim())
    const validDate = validDecisionDate(record.decisionDate)
    const traceable = hasTraceableSource(record)
    const usable = assessEvidenceQuality(record).usableForPattern
    if (!completeReasoning) counters.reasoning++
    if (!hasOutcome) counters.outcome++
    if (!validDate) counters.date++
    if (!traceable) counters.traceability++
    if (!usable) counters.quality++
    if (!(completeReasoning && hasOutcome && validDate && traceable && usable)) continue

    qualified.push(record)
    if (venueText(record.court) !== venueText(target.court) || !venueText(target.court)) {
      counters.court++
      continue
    }
    if (!venueText(target.judgingBody) ||
        venueText(record.judgingBody) !== venueText(target.judgingBody)) {
      counters.judgingBody++
      continue
    }
    comparable.push(record)
  }

  const dates = comparable.map(record => record.decisionDate!)
    .map(date => new Date(date).toISOString().slice(0, 10)).sort()
  const addGap = (label: string, count: number, guidance: string): EvidenceGap | null =>
    count ? { label, count, guidance } : null
  const gaps = [
    addGap("Fundamentação não disponível", counters.reasoning,
      "Consultar o inteiro teor das decisões; movimentações processuais não demonstram fundamentos."),
    addGap("Resultado decisório não identificado", counters.outcome,
      "Conferir o dispositivo da decisão antes de identificar acolhimento ou rejeição."),
    addGap("Data da decisão ausente ou inválida", counters.date,
      "Confirmar a data da decisão, não apenas a data de distribuição ou andamento."),
    addGap("Referência de origem insuficiente", counters.traceability,
      "Registrar processo, identificador documental ou URL pública verificável."),
    addGap("Outros requisitos de qualidade ausentes", counters.quality,
      "Conferir classe, assunto, órgão julgador e metadados do documento."),
    addGap("Decisões de outro tribunal", counters.court,
      "Separar as decisões de tribunais distintos; elas não formam um padrão do mesmo juízo."),
    addGap("Decisões de outro órgão julgador", counters.judgingBody,
      "Verificar vara/turma e não atribuir suas decisões ao juízo selecionado."),
    addGap("Registros duplicados", duplicates, "Conferir identificadores e evitar contagem repetida."),
  ].filter((gap): gap is EvidenceGap => gap !== null)

  return {
    recordsReceived: records.length,
    distinctRecords: distinct.length,
    duplicateRecords: duplicates,
    qualifiedDecisions: qualified.length,
    comparableDecisions: comparable.length,
    // Exploratory minimum only; it is NOT a statistical sample-size guarantee.
    enoughForDescriptivePattern: comparable.length >= 3,
    period: dates.length ? `${dates[0]} a ${dates[dates.length - 1]}` : null,
    gaps,
    review: distinct.slice(0, 8).map(record => ({
      id: record.id,
      court: record.court,
      judgingBody: record.judgingBody || null,
      processNumber: record.processNumber || null,
      source: record.source,
      documentReference: record.sourceDocumentId || null,
      decisionDate: validDecisionDate(record.decisionDate) ? record.decisionDate! : null,
      qualified: qualified.includes(record),
    })),
    comparableEvidence: comparable,
  }
}
