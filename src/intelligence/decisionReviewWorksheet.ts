import type { JudicialDecisionEvidence } from "./judicialDecisionSchema"
import { auditDecisionEvidence } from "./decisionEvidenceAudit"

/**
 * A documentary workbench for HUMAN comparison of counsel's argument with
 * the original decision reasoning. This does not calculate similarity,
 * agreement, judicial propensity, or likelihood of success.
 */
export interface DecisionReviewEntry {
  evidenceId: string
  processNumber: string | null
  court: string
  judgingBody: string | null
  decisionDate: string | null
  documentReference: string | null
  sourceUrl: string | null
  observedOutcome: string
  reasoningExcerpts: string[]
  remainingReasoningSegments: number
}

export function buildDecisionReviewWorksheet(
  records: readonly JudicialDecisionEvidence[],
  target: { court?: string; judgingBody?: string },
): DecisionReviewEntry[] {
  const audit = auditDecisionEvidence(records, target)
  return audit.comparableEvidence.map((item) => {
    // Reuse audit's safe URL validation and exact document eligibility.
    const review = audit.review.find((row) => row.id === item.id && row.comparable)
    const reasoning = item.reasoning.map((text) => text.trim()).filter(Boolean)
    return {
      evidenceId: item.id,
      processNumber: item.processNumber || null,
      court: item.court,
      judgingBody: item.judgingBody || null,
      decisionDate: item.decisionDate?.slice(0, 10) || null,
      documentReference: review?.documentReference ?? null,
      sourceUrl: review?.sourceUrl ?? null,
      observedOutcome: item.observedOutcome!.trim(),
      reasoningExcerpts: reasoning.slice(0, 3),
      remainingReasoningSegments: Math.max(0, reasoning.length - 3),
    }
  })
}
