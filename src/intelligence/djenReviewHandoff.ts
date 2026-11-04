/**
 * Transient, account-bound handoff from a DJEN publication to a lawyer's
 * existing precedent library. The source is NOT judicial reasoning and is
 * never saved without human input and an explicit click on Save.
 */
export type DjenReviewHandoff = {
  source: "djen-publication-review"
  userId: string
  processNumber: string
  court: string
  judgingBody: string
  documentType: string
  sourceUrl: string
}

function limited(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : ""
}

function safeCourtLink(value: unknown): string | null {
  try {
    const url = new URL(String(value))
    return url.protocol === "https:" && !url.username && !url.password &&
      /(?:^|\.)jus\.br$/i.test(url.hostname) ? url.href : null
  } catch { return null }
}

export function makeDjenReviewHandoff(
  value: unknown, authenticatedUserId: string | undefined,
): DjenReviewHandoff | null {
  if (!authenticatedUserId || !value || typeof value !== "object") return null
  const item = value as Record<string, unknown>
  const sourceUrl = safeCourtLink(item.sourceUrl)
  const processNumber = limited(item.processNumber, 30).replace(/\D/g, "")
  if (!sourceUrl || processNumber.length !== 20 || item.candidateForManualReview !== true) return null
  return {
    source: "djen-publication-review",
    userId: authenticatedUserId,
    processNumber,
    court: limited(item.court, 18),
    judgingBody: limited(item.judgingBody, 130),
    documentType: limited(item.documentType, 90),
    sourceUrl,
  }
}

export function readDjenReviewHandoff(
  routeState: unknown, authenticatedUserId: string | undefined,
): DjenReviewHandoff | null {
  if (!routeState || typeof routeState !== "object") return null
  const item = (routeState as Record<string, unknown>).djenReview
  if (!item || typeof item !== "object") return null
  const data = item as Record<string, unknown>
  if (!authenticatedUserId || data.source !== "djen-publication-review" ||
      data.userId !== authenticatedUserId) return null
  return makeDjenReviewHandoff(
    { ...data, candidateForManualReview: true }, authenticatedUserId,
  )
}
