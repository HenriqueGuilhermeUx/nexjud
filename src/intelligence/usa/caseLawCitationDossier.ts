/**
 * NexJud USA — public case-law citation dossier from CourtListener search.
 *
 * The dossier NEVER infers binding precedent, good law / negative treatment,
 * court hierarchy, outcome, winning odds or judge-level statistics.
 * The search result is an unverified discovery aid until independently read
 * and checked against underlying opinion and subsequent citation history.
 */
import type { USAOpinionEvidence } from "./courtListenerNormalizer"

export interface USAUnverifiedCitationCard {
  evidenceId: string
  caseName: string
  court: string
  courtId: string | null
  decidedAt: string | null
  citation: string[]
  officialOpinionUrl: string | null
  collectedAt: string
  hasVerifiedOpinionText: false
  subsequentTreatmentChecked: false
  bindingAuthorityDetermined: false
  legalOutcomeVerified: false
}

export interface USCaseLawCitationDossier {
  source: "courtlistener"
  jurisdiction: "US"
  cards: USAUnverifiedCitationCard[]
  ignoredUnsafeOrDuplicated: number
  recordCount: number
  caseLawResearchOnly: true
  legalAdviceOrOutcomePrediction: false
  citationValidityConfirmed: false
  warning: string
}

function strictDate(s: unknown): boolean {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const t = Date.parse(s + "T00:00:00Z")
  return Number.isFinite(t) && new Date(t).toISOString().slice(0,10) === s
}
function trustedOpinionUrl(url: string | undefined): string | null {
  if (typeof url !== "string") return null
  try {
    const u = new URL(url)
    return u.protocol === "https:" && u.hostname === "www.courtlistener.com" &&
      !u.username && !u.password && !u.hash && !u.search &&
      /^\/opinion\/[1-9]\d*(?:\/[A-Za-z0-9._%-]+)?\/?$/.test(u.pathname)
      ? u.href : null
  } catch { return null }
}
function safeLabel(x: unknown, max: number): x is string {
  return typeof x === "string" && x.length >= 1 && x.length <= max &&
    !/[\x00-\x1f\x7f<>]/.test(x)
}

export function buildUSUnverifiedCitationDossier(
  evidence: readonly USAOpinionEvidence[],
): USCaseLawCitationDossier {
  if (!Array.isArray(evidence) || evidence.length > 200) {
    throw new Error("Invalid USA case-law search size")
  }
  const seen = new Set<string>()
  let skipped = 0
  const cards: USAUnverifiedCitationCard[] = []
  for (const row of evidence) {
    if (!row || row.source !== "courtlistener" || row.jurisdiction !== "US" ||
        !/^[1-9]\d*$/.test(row.sourceRecordId) ||
        !safeLabel(row.caseName, 500) || !safeLabel(row.court, 500) ||
        !row.collectedAt || !Number.isFinite(Date.parse(row.collectedAt)) ||
        row.outcomeVerified !== false || row.predictionEligible !== false ||
        row.observedOutcome !== null) {
      throw new Error("Invalid or overstated US opinion source record")
    }
    if (seen.has(row.sourceRecordId)) { skipped++; continue }
    seen.add(row.sourceRecordId)
    // Missing/unsafe provider URLs stay null; they never become open links.
    // Never promote a snippet into proof of published precedent.
    const url = trustedOpinionUrl(row.sourceUrl)
    if (!Array.isArray(row.citation) ||
        row.citation.some(c => !safeLabel(c, 500)) ||
        (row.decidedAt !== undefined && !strictDate(row.decidedAt))) {
      throw new Error("Malformed legal citation evidence")
    }
    const citation: string[] = [...new Set<string>(row.citation as string[])]
    cards.push({
      evidenceId: row.sourceRecordId,
      caseName: row.caseName,
      court: row.court,
      courtId: row.courtId && safeLabel(row.courtId, 500) ? row.courtId : null,
      decidedAt: row.decidedAt ?? null,
      citation,
      officialOpinionUrl: url,
      collectedAt: row.collectedAt,
      hasVerifiedOpinionText: false,
      subsequentTreatmentChecked: false,
      bindingAuthorityDetermined: false,
      legalOutcomeVerified: false,
    })
  }
  return {
    source: "courtlistener", jurisdiction: "US", cards,
    ignoredUnsafeOrDuplicated: skipped,
    recordCount: cards.length,
    caseLawResearchOnly: true,
    legalAdviceOrOutcomePrediction: false,
    citationValidityConfirmed: false,
    warning: "Search metadata is not a legal citator: independently confirm the opinion, subsequent treatment, binding effect and current validity.",
  }
}
