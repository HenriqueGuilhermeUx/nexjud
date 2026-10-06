import type { JudicialDecisionEvidence, JudicialDecisionSource } from "./judicialDecisionSchema"

export interface PublicJudicialDocumentInput {
  id: string
  text: string
  court: string
  source: JudicialDecisionSource
  sourceUrl?: string
  processNumber?: string
  collectedAt?: string
}

/** Parser determinístico inicial. Não classifica mérito nem inventa conteúdo ausente. */
export function parsePublicJudicialDocument(input: PublicJudicialDocumentInput): JudicialDecisionEvidence {
  const clean = input.text.replace(/\r/g, "").trim()
  const sections = (label: RegExp) => clean.match(label)?.[1]?.trim() || ""
  const reasoning = sections(/(?:fundamenta[cç][aã]o|fundamentos?)\s*[:\-]?\s*([\s\S]*?)(?=\n\s*(?:dispositivo|decis[aã]o)\b|$)/i)
  const outcome = sections(/(?:dispositivo|decis[aã]o)\s*[:\-]?\s*([\s\S]*)$/i)
  return {
    id: input.id, processNumber: input.processNumber, court: input.court,
    subjects: [], facts: [], claims: [], legalTheses: [], reasoning: reasoning ? [reasoning] : [],
    citedPrecedents: [], citedLegislation: [], observedOutcome: outcome || undefined,
    source: input.source, sourceUrl: input.sourceUrl, collectedAt: input.collectedAt || new Date().toISOString(),
    extractionConfidence: reasoning || outcome ? 0.65 : 0.35,
  }
}
