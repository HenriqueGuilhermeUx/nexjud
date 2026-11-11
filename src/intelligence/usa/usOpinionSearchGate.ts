/**
 * NexJud USA — fail-closed policy boundary for lawyer-facing opinion search.
 *
 * This is a pure service, not a deployed endpoint. Its runtime adapters must
 * validate the JWT against the US identity provider and check tenant membership,
 * entitlements and an ATOMIC quota server side. No user-supplied IDs or roles.
 * CourtListener receives the user's literal query; require informed opt-in.
 */
import { normalizeCourtListenerResults, type CourtListenerOpinionSearchHit, type USAOpinionEvidence } from "./courtListenerNormalizer.ts"

export class USLegalSearchDenied extends Error {
  constructor(public readonly code: "DISABLED" | "INVALID_QUERY" | "CONSENT_REQUIRED" |
    "UNAUTHENTICATED" | "FORBIDDEN" | "QUOTA_EXHAUSTED") {
    super("US legal search request rejected.")
    this.name = "USLegalSearchDenied"
  }
}

export interface VerifiedUSPrincipal {
  /** User identity comes from verified US JWT, never user_metadata. */
  userId: string
  /** Membership in this US tenant must be verified by a server-side database lookup. */
  tenantId: string
  role: "lawyer" | "firm_admin" | "researcher" | "other"
}

export interface USOpinionSearchDependencies {
  enabled: boolean
  commercialUseAuthorized: boolean
  principal(): Promise<VerifiedUSPrincipal | null>
  entitled(identity: VerifiedUSPrincipal): Promise<boolean>
  /** Atomic, durable decrement required. A process-local Map is not safe. */
  consumeQuota(identity: VerifiedUSPrincipal): Promise<boolean>
  fetchOpinions(query: string): Promise<unknown[]>
  collectedAt(): string
}

export interface USAOpinionSearchResult {
  source: "courtlistener"
  jurisdiction: "US"
  predictiveModelAvailable: false
  records: USAOpinionEvidence[]
  caveat: string
}

export async function runUSOpinionSearch(
  request: unknown,
  deps: USOpinionSearchDependencies,
): Promise<USAOpinionSearchResult> {
  if (deps.enabled !== true || deps.commercialUseAuthorized !== true) {
    throw new USLegalSearchDenied("DISABLED")
  }
  if (!request || typeof request !== "object" || Array.isArray(request)) {
    throw new USLegalSearchDenied("INVALID_QUERY")
  }
  const input = request as Record<string, unknown>
  // Deny client-supplied principal/tenant/role or alternate provider endpoints.
  const allowed = ["query", "providerDisclosureAccepted"]
  if (Object.keys(input).some(k => !allowed.includes(k))) {
    throw new USLegalSearchDenied("INVALID_QUERY")
  }
  const query = input.query
  if (typeof query !== "string" || query.trim().length < 3 || query.trim().length > 160 ||
    /[\r\n]/.test(query) || /\b(?:\d[ -]*?){9}\b/.test(query)) {
    throw new USLegalSearchDenied("INVALID_QUERY")
  }
  if (input.providerDisclosureAccepted !== true) {
    throw new USLegalSearchDenied("CONSENT_REQUIRED")
  }
  const identity = await deps.principal()
  if (!identity?.userId || !identity?.tenantId || !["lawyer", "firm_admin", "researcher"].includes(identity.role)) {
    throw new USLegalSearchDenied(identity ? "FORBIDDEN" : "UNAUTHENTICATED")
  }
  if (!(await deps.entitled(identity))) throw new USLegalSearchDenied("FORBIDDEN")
  if (!(await deps.consumeQuota(identity))) throw new USLegalSearchDenied("QUOTA_EXHAUSTED")
  const raw = await deps.fetchOpinions(query.trim())
  if (!Array.isArray(raw) || raw.length > 1000) {
    throw new Error("Invalid provider response.")
  }
  return {
    source: "courtlistener",
    jurisdiction: "US",
    predictiveModelAvailable: false,
    records: normalizeCourtListenerResults(raw as CourtListenerOpinionSearchHit[], deps.collectedAt()),
    caveat: "Search results are public-record evidence, not verified case outcomes or calibrated forecasts.",
  }
}
