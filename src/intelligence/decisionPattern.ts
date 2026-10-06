import type { JudicialDecisionEvidence } from "./judicialDecisionSchema"
import { assessEvidenceQuality } from "./evidenceQuality"
import { hasTraceableSource } from "./provenance"

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

function count(values: string[]) {
  const counts = new Map<string, number>()
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1))
  return [...counts].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count)
}

export function buildObservedDecisionPattern(items: JudicialDecisionEvidence[]): ObservedDecisionPattern | null {
  const qualified = items.filter((item) => assessEvidenceQuality(item).usableForPattern && hasTraceableSource(item))
  if (!qualified.length) return null
  const dates = qualified.map((item) => item.decisionDate).filter(Boolean).sort() as string[]
  return {
    court: qualified[0].court,
    judgingBody: qualified[0].judgingBody,
decisionsAnalyzed: qualified.length,
    period: dates.length ? `${dates[0]} a ${dates[dates.length - 1]}` : undefined,
    recurringTheses: count(qualified.flatMap((item) => item.legalTheses)),
    recurringPrecedents: count(qualified.flatMap((item) => item.citedPrecedents)),
    observedOutcomes: count(qualified.map((item) => item.observedOutcome || "")),
    evidenceIds: qualified.map((item) => item.id),
    warning: "Padrões observados em decisões públicas não representam previsão nem garantia de resultado.",
  }
}
