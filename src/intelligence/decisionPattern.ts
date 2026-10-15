import type { JudicialDecisionEvidence } from "./judicialDecisionSchema"
import { assessEvidenceQuality } from "./evidenceQuality"
import { hasTraceableSource, hasVerifiableDecisionDocument } from "./provenance"
import { auditDecisionEvidence } from "./decisionEvidenceAudit"

export interface ObservedDecisionPattern {
  court: string
  judgingBody?: string
  decisionsAnalyzed: number
  period?: string
  recurringTheses: Array<{ label: string; count: number }>
  recurringPrecedents: Array<{ label: string; count: number }>
  observedOutcomes: Array<{ label: string; count: number }>
  evidenceIds: string[]
  warning: string
}

function venueText(value: string | undefined): string {
  return (value || "").normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR")
}

function count(values: string[]) {
  const counts = new Map<string, number>()
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1))
  return [...counts].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count)
}

export function buildObservedDecisionPattern(items: JudicialDecisionEvidence[]): ObservedDecisionPattern | null {
  // A direct caller must not bypass audit gates (document reference, date,
  // duplicates, exact judging body, or exploratory minimum of three decisions).
  const anchor = items.find((item) =>
    assessEvidenceQuality(item).usableForPattern &&
    hasTraceableSource(item) &&
    hasVerifiableDecisionDocument(item) &&
    venueText(item.court) &&
    venueText(item.judgingBody))
  if (!anchor) return null
  const court = anchor.court
  const judgingBody = anchor.judgingBody
  const audit = auditDecisionEvidence(items, { court, judgingBody })
  if (!audit.enoughForDescriptivePattern) return null
  const comparable = audit.comparableEvidence
  // Preserve the date printed on the judicial decision, not the UTC rollover.
  const dates = comparable.map((item) => item.decisionDate?.slice(0, 10))
    .filter((date): date is string => Boolean(date)).sort()
  return {
    court,
    judgingBody,
    decisionsAnalyzed: comparable.length,
    period: dates.length ? `${dates[0]} a ${dates[dates.length - 1]}` : undefined,
    recurringTheses: count(comparable.flatMap((item) => item.legalTheses)),
    recurringPrecedents: count(comparable.flatMap((item) => item.citedPrecedents)),
    observedOutcomes: count(comparable.map((item) => item.observedOutcome || "")),
    evidenceIds: comparable.map((item) => item.id),
    warning: "Padrões observados em decisões públicas não representam previsão nem garantia de resultado.",
  }
}
