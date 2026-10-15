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

/**
 * A case number or a DataJud movement identifies the proceeding, not the
 * court document with the judicial reasoning and ruling. Only a document
 * reference from a court/public-document source supports decision patterns.
 */
export function hasVerifiableDecisionDocument(item: JudicialDecisionEvidence): boolean {
  if (item.source === "datajud") return false
  return Boolean(
    item.sourceDocumentId?.trim() ||
    (item.sourceUrl && /^https?:\/\/\S+$/i.test(item.sourceUrl.trim())),
  )
}
