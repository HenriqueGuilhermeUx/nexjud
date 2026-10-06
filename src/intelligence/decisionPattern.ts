import type { JudicialDecisionEvidence } from "./judicialDecisionSchema"\nimport { assessEvidenceQuality } from "./evidenceQuality"\nimport { hasTraceableSource } from "./provenance"

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

function count(values: string[]) { const m=new Map<string,number>(); values.filter(Boolean).forEach(v=>m.set(v,(m.get(v)||0)+1)); return [...m].map(([label,count])=>({label,count})).sort((a,b)=>b.count-a.count) }

export function buildObservedDecisionPattern(items: JudicialDecisionEvidence[]): ObservedDecisionPattern | null {
  if (!items.length) return null
  const dates=items.map(i=>i.decisionDate).filter(Boolean).sort() as string[]
  return {
    court: qualified[0].court,
    judgingBody: qualified[0].judgingBody,
    decisionsAnalyzed: qualified.length,
    period: dates.length ? `${dates[0]} a ${dates[dates.length-1]}` : undefined,
    recurringTheses: count(qualified.flatMap(i=>i.legalTheses)),
    recurringPrecedents: count(qualified.flatMap(i=>i.citedPrecedents)),
    observedOutcomes: count(qualified.map(i=>i.observedOutcome || "")),
    evidenceIds: qualified.map(i=>i.id),
    warning: "Padrões observados em decisões públicas não representam previsão nem garantia de resultado.",
  }
}
