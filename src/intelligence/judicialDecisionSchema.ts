export type JudicialDecisionSource = "datajud" | "tribunal_publico" | "documento_publico"

export interface JudicialDecisionEvidence {
  id: string
  processNumber?: string
  court: string
  judgingBody?: string
  judgeOrRapporteur?: string
  decisionDate?: string
  caseClass?: string
  subjects: string[]
  facts: string[]
  claims: string[]
  legalTheses: string[]
  reasoning: string[]
  citedPrecedents: string[]
  citedLegislation: string[]
  observedOutcome?: string
  source: JudicialDecisionSource
  sourceUrl?: string
  sourceDocumentId?: string
  contentHash?: string
  collectedAt: string
  extractionConfidence?: number
}

export interface CourtAdapterHealth {
  adapterId: string
  court: string
  source: JudicialDecisionSource
  status: "healthy" | "degraded" | "failed"
  lastSuccessfulCollection?: string
  lastCheckedAt: string
  schemaFingerprint?: string
  diagnostic?: string
}

export interface CourtAdapter {
  id: string
  court: string
  source: JudicialDecisionSource
  publicOrAuthorized: true
  health(): Promise<CourtAdapterHealth>
}
