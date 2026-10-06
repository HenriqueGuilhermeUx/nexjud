import type { JudicialDecisionEvidence } from "./judicialDecisionSchema"

export interface EvidenceProvenance {
  evidenceId: string
  source: string
  sourceUrl?: string
  sourceDocumentId?: string
  contentHash?: string
  collectedAt: string
}

export function provenanceOf(item: JudicialDecisionEvidence): EvidenceProvenance {
  return { evidenceId:item.id, source:item.source, sourceUrl:item.sourceUrl, sourceDocumentId:item.sourceDocumentId, contentHash:item.contentHash, collectedAt:item.collectedAt }
}

export function hasTraceableSource(item: JudicialDecisionEvidence) {
  return Boolean(item.source && item.collectedAt && (item.sourceUrl || item.sourceDocumentId || item.processNumber))
}
