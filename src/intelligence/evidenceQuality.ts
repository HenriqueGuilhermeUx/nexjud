import type { JudicialDecisionEvidence } from "./judicialDecisionSchema"

export interface EvidenceQuality {
  score: number
  level: "alta" | "media" | "baixa"
  missing: string[]
  usableForPattern: boolean
}

export function assessEvidenceQuality(item: JudicialDecisionEvidence): EvidenceQuality {
  const checks: Array<[string, boolean, number]> = [
    ["tribunal", Boolean(item.court), 15], ["processo", Boolean(item.processNumber), 15],
    ["órgão julgador", Boolean(item.judgingBody), 15], ["data da decisão", Boolean(item.decisionDate), 10],
    ["classe", Boolean(item.caseClass), 10], ["assunto", item.subjects.length > 0, 10],
    ["fundamentação", item.reasoning.length > 0, 15], ["resultado observado", Boolean(item.observedOutcome), 10],
  ]
  const score = checks.reduce((sum,[,ok,w]) => sum + (ok ? w : 0), 0)
  const missing = checks.filter(([,ok]) => !ok).map(([name]) => name)
  return { score, level: score >= 80 ? "alta" : score >= 50 ? "media" : "baixa", missing, usableForPattern: score >= 50 }
}
