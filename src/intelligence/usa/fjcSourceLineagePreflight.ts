/**
 * NexJud USA — OFFLINE, SYNTHETIC-FIRST FJC raw-to-converted data lineage.
 *
 * A trusted, separately administered source registry must pin the review
 * packet OUTSIDE the uploaded raw file, converter output and user input.
 * This checks exact file bytes against that packet. A URL shaped like fjc.gov
 * and matching SHA-256s cannot establish publisher authenticity, actual
 * reviewer identity, approved use rights or archived historical snapshots.
 * No network calls, dataset import, PHI, legal predictions or production use.
 */
import type { FJCCivilManifest } from "./fjcCivilCohort"
import type { USCivilResearchSelection } from "./fjcCivilResearchMemo"
import { verifyFJCSourceDigest } from "./fjcSnapshotDigest"

export interface USFJCIndependentReleaseReviewPacket {
  datasetId: string
  revision: string
  asOfDate: string
  /** URL captured by an external source-audit process (not from parsed rows). */
  declaredPublisherReleaseUrl: string
  codebookUrl: string
  /** Exact digest of the original, UNCONVERTED release artifact. */
  originalReleaseSha256: string
  /** Exact digest of the separately converted JSON artifact. */
  convertedExtractSha256: string
  /** Identifies a frozen conversion procedure; not verified by this gate. */
  converterProcedureSha256: string
  codebookRevision: string
  originalCaptureEvidenceSha256: string
  fieldMappingReviewEvidenceSha256: string
  rightsReviewEvidenceSha256: string
  conversionOperatorId: string
  sourceReviewerId: string
  mappingReviewerId: string
  rightsReviewerId: string
  /** This declaration is NOT itself a license or legal authorization. */
  rightsDisposition: "OFFLINE_RESEARCH_REVIEWED"
  sourceObservedAt: string
  reviewRecordedAt: string
}

export interface USFJCSourceLineageInput {
  /** Exact original bytes received by the independently controlled adapter. */
  originalReleaseBytes: Uint8Array
  /** Retrieved by a trusted operator-owned registry; never accept browser claims. */
  independentReviewPacket: USFJCIndependentReleaseReviewPacket
}

export interface USFJCSourceLineageReport {
  status: "DECLARED_REVIEW_PACKET_HASHES_MATCH"
  sourceBytesMatchedPinnedDigest: true
  convertedBytesMatchedPinnedDigest: true
  reviewerIdsStructurallyDistinct: true
  sourceMetadataCrossBound: true
  /** A declaration / digest match cannot independently authenticate the FJC. */
  publisherReleaseAuthenticated: false
  independentReviewerIdentityCryptographicallyVerified: false
  conversionProcedureReproduced: false
  researchUseRightsLegallyCertified: false
  genuineHistoricalSnapshotVerified: false
  legalPredictionApproved: false
}

const HEX = /^[0-9a-f]{64}$/i
const SIMPLE = /^[A-Za-z0-9_.:-]{3,120}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/
const cleanString = (s: unknown): s is string =>
  typeof s === "string" && SIMPLE.test(s)
const hash = (s: unknown): s is string =>
  typeof s === "string" && HEX.test(s)
const date = (s: unknown): s is string => {
  if (typeof s !== "string" || !DATE.test(s)) return false
  const value = Date.parse(s + "T00:00:00Z")
  return Number.isFinite(value) && new Date(value).toISOString().slice(0,10) === s
}
const timestamp = (s: unknown): number | null => {
  if (typeof s !== "string" || !UTC.test(s)) return null
  const value = Date.parse(s)
  return Number.isFinite(value) && new Date(value).toISOString() === s.replace(".000Z","Z").replace("Z",".000Z")
    ? value : null
}

function approvedShapeURL(value: unknown): boolean {
  if (typeof value !== "string" || value.length > 2048) return false
  try {
    const url = new URL(value)
    return url.protocol === "https:" &&
      (url.hostname === "fjc.gov" || url.hostname.endsWith(".fjc.gov")) &&
      !url.username && !url.password && !url.hash && !url.search &&
      !url.port && url.pathname.startsWith("/") && !value.includes("\\")
  } catch { return false }
}

export async function preflightUSFJCIndependentReleaseLineage(
  originalReleaseBytes: Uint8Array,
  convertedExtractBytes: Uint8Array,
  manifest: FJCCivilManifest,
  selection: USCivilResearchSelection,
  packet: USFJCIndependentReleaseReviewPacket,
): Promise<USFJCSourceLineageReport> {
  const fail = () => { throw new Error("Unverified FJC original-to-converted release lineage") }
  if (!(originalReleaseBytes instanceof Uint8Array) ||
      originalReleaseBytes.byteLength === 0 ||
      originalReleaseBytes.byteLength > 50_000_000 ||
      !(convertedExtractBytes instanceof Uint8Array) ||
      convertedExtractBytes.byteLength < 2 ||
      convertedExtractBytes.byteLength > 8_000_000 ||
      !manifest || !selection || !packet) return fail()

  const reviewers = [packet.conversionOperatorId, packet.sourceReviewerId,
    packet.mappingReviewerId, packet.rightsReviewerId]
  const observed = timestamp(packet.sourceObservedAt)
  const reviewed = timestamp(packet.reviewRecordedAt)
  if (reviewers.some(id => !cleanString(id)) ||
      new Set(reviewers).size !== reviewers.length ||
      !cleanString(packet.datasetId) || !cleanString(packet.revision) ||
      !cleanString(packet.codebookRevision) ||
      !date(packet.asOfDate) ||
      !approvedShapeURL(packet.declaredPublisherReleaseUrl) ||
      !approvedShapeURL(packet.codebookUrl) ||
      !hash(packet.originalReleaseSha256) ||
      !hash(packet.convertedExtractSha256) ||
      !hash(packet.converterProcedureSha256) ||
      !hash(packet.originalCaptureEvidenceSha256) ||
      !hash(packet.fieldMappingReviewEvidenceSha256) ||
      !hash(packet.rightsReviewEvidenceSha256) ||
      new Set([packet.originalCaptureEvidenceSha256.toLowerCase(),
        packet.fieldMappingReviewEvidenceSha256.toLowerCase(),
        packet.rightsReviewEvidenceSha256.toLowerCase()]).size !== 3 ||
      observed === null || reviewed === null || observed > reviewed ||
      packet.rightsDisposition !== "OFFLINE_RESEARCH_REVIEWED" ||
      manifest.codebookMappingReviewed !== true ||
      manifest.useRightsReviewed !== true ||
      selection.sourceAuditApproved !== true ||
      packet.datasetId !== manifest.datasetId ||
      packet.datasetId !== selection.sourceDatasetId ||
      packet.revision !== manifest.revision ||
      packet.revision !== selection.sourceRevision ||
      packet.asOfDate !== manifest.asOfDate ||
      packet.asOfDate !== selection.snapshotAsOfDate ||
      packet.declaredPublisherReleaseUrl !== manifest.sourceUrl ||
      packet.codebookUrl !== manifest.codebookUrl ||
      packet.convertedExtractSha256.toLowerCase() !== manifest.releaseSha256.toLowerCase() ||
      packet.convertedExtractSha256.toLowerCase() !== selection.sourceSha256.toLowerCase()) {
    return fail()
  }
  if (!(await verifyFJCSourceDigest(originalReleaseBytes, packet.originalReleaseSha256)) ||
      !(await verifyFJCSourceDigest(convertedExtractBytes, packet.convertedExtractSha256))) {
    return fail()
  }
  return {
    status: "DECLARED_REVIEW_PACKET_HASHES_MATCH",
    sourceBytesMatchedPinnedDigest: true,
    convertedBytesMatchedPinnedDigest: true,
    reviewerIdsStructurallyDistinct: true,
    sourceMetadataCrossBound: true,
    publisherReleaseAuthenticated: false,
    independentReviewerIdentityCryptographicallyVerified: false,
    conversionProcedureReproduced: false,
    researchUseRightsLegallyCertified: false,
    genuineHistoricalSnapshotVerified: false,
    legalPredictionApproved: false,
  }
}
