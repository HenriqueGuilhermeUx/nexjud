import type { DatajudProcess } from "@/services/datajudService"
import type { JudicialDecisionEvidence } from "./judicialDecisionSchema"

function text(value: unknown) { return typeof value === "string" ? value.trim() : "" }
function list(value: unknown): string[] { return Array.isArray(value) ? value.map(text).filter(Boolean) : text(value) ? [text(value)] : [] }

/** Normaliza apenas campos presentes na resposta pública. Campos jurídicos não inferidos ficam vazios. */
export function datajudProcessToEvidence(process: DatajudProcess, alias?: string): JudicialDecisionEvidence {
  const raw = (process.raw || {}) as Record<string, any>
  const id = text(raw.id) || text(raw._id) || `datajud:${process.number}`
  return {
    id,
    processNumber: process.number,
    court: process.court || alias || "Tribunal não identificado",
    judgingBody: process.courtUnit || undefined,
    judgeOrRapporteur: text(raw.magistrado) || text(raw.relator) || undefined,
    decisionDate: text(raw.dataDecisao) || undefined,
    caseClass: process.className || undefined,
    subjects: list(process.subject),
    facts: [],
    claims: [],
    legalTheses: [],
    reasoning: [],
    citedPrecedents: [],
    citedLegislation: [],
    observedOutcome: undefined,
    source: "datajud",
    sourceDocumentId: text(raw.id) || text(raw._id) || undefined,
    collectedAt: new Date().toISOString(),
    extractionConfidence: 1,
  }
}

export function datajudCasesToEvidence(cases: unknown[], alias?: string): JudicialDecisionEvidence[] {
  return cases.flatMap((item) => {
    const candidate = item as Partial<DatajudProcess>
    if (!candidate?.number || !candidate?.court) return []
    return [datajudProcessToEvidence(candidate as DatajudProcess, alias)]
  })
}
