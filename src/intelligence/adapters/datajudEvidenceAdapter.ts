import type { DatajudProcess } from "@/services/datajudService"
import type { JudicialDecisionEvidence } from "../judicialDecisionSchema"

function text(value: unknown): string { return typeof value === "string" ? value.trim() : "" }
function list(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => text(item?.nome ?? item?.descricao ?? item)).filter(Boolean)
  return text(value) ? [text(value)] : []
}

/** Normaliza metadados públicos sem inferir fundamentação, resultado ou conteúdo decisório. */
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
    facts: [], claims: [], legalTheses: [], reasoning: [],
    citedPrecedents: [], citedLegislation: [],
    observedOutcome: undefined,
    source: "datajud",
    sourceDocumentId: text(raw.id) || text(raw._id) || undefined,
    collectedAt: new Date().toISOString(),
    extractionConfidence: 1,
  }
}

/** A busca de similares retorna _source bruto do DataJud, não DatajudProcess normalizado. */
export function datajudCasesToEvidence(cases: unknown[], alias?: string): JudicialDecisionEvidence[] {
  return cases.flatMap((item) => {
    if (!item || typeof item !== "object") return []
    const raw = item as Record<string, any>
    const number = text(raw.numeroProcesso) || text(raw.numero) || text(raw.number)
    if (!number) return []
    const court = text(raw.tribunal) || text(raw.siglaTribunal) || text(raw.court) || alias || ""
    const normalized: DatajudProcess = {
      number,
      court,
      courtUnit: text(raw.orgaoJulgador?.nome) || text(raw.courtUnit),
      className: text(raw.classe?.nome) || text(raw.classeProcessual?.nome) || text(raw.className),
      subject: list(raw.assuntos ?? raw.assunto ?? raw.subject).join(", "),
      filingDate: text(raw.dataAjuizamento) || null,
      parties: [],
      movements: [],
      raw,
    }
    return [datajudProcessToEvidence(normalized, alias)]
  })
}
