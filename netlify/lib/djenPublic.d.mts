export interface PublicDjenItem {
  id: string
  processNumber: string
  court: string
  judgingBody: string
  documentType: string
  publicationKind: string
  availableDate: string
  candidateForManualReview: boolean
  confirmedDecision: false
  identifiedJudge: false
  sourceUrl: string | null
}
export function normalizeDjenPublicPage(
  data: unknown,
  requestedProcess: string,
): {
  source: string
  disclaimer: string
  countShown: number
  truncated: boolean
  items: PublicDjenItem[]
}
