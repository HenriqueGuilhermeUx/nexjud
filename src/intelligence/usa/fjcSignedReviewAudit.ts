/**
 * OFFLINE NexJud USA / FJC — cryptographic review-record gate, synthetic first.
 *
 * A SERVER-TRUSTED registry (outside the incoming packet) pins three P-256
 * service reviewer keys. This verifies signatures over an exact, versioned
 * record and a PREVIOUS digest supplied by the independent registry.
 * It does NOT establish natural-person identity, official FJC publication,
 * legal rights, immutable persistence, or model validation.
 */
import type { USFJCIndependentReleaseReviewPacket } from "./fjcSourceLineagePreflight"

export type USFJCReviewRole = "source" | "mapping" | "rights"
export interface USFJCReviewSignature {
  role: USFJCReviewRole
  reviewerId: string
  keyId: string
  /** WebCrypto P-256 ECDSA SHA-256, IEEE P1363 raw r || s, hex. */
  signatureHex: string
}
export interface USFJCSignedReviewRecord {
  sequence: number
  previousDigest: string
  signedAt: string
  signatures: readonly USFJCReviewSignature[]
}
export interface USFJCTrustedReviewKey {
  role: USFJCReviewRole
  reviewerId: string
  keyId: string
  /** Independently pinned on the server, not derived from the review. */
  pinnedSpkiSha256: string
  spkiBytes: Uint8Array
  activatedAt: string
  expiresAt: string
  revokedAt: string | null
}
export interface USFJCIndependentReviewRegistry {
  expectedSequence: number
  expectedPreviousDigest: string
  keys: readonly USFJCTrustedReviewKey[]
}
export interface USFJCSignedReviewResult {
  status: "THREE_PINNED_REVIEW_SIGNATURES_VERIFIED"
  linkedRecordDigest: string
  rolesVerified: readonly ["source", "mapping", "rights"]
  registryLinkMatched: true
  pinnedReviewerKeysVerified: true
  /** No independent identity provider or append-only persistent ledger here. */
  reviewerRealWorldIdentityVerified: false
  immutableLedgerPersistenceVerified: false
  officialFJCReleaseAuthenticated: false
  legalUseRightsCertified: false
  caseOutcomePredictionApproved: false
}
const ROLES = ["source", "mapping", "rights"] as const
const HEX64 = /^[0-9a-f]{64}$/i
const ID = /^[A-Za-z0-9_.:-]{3,120}$/
const UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/
const FIELDS = [
  "datasetId", "revision", "asOfDate", "declaredPublisherReleaseUrl",
  "codebookUrl", "originalReleaseSha256", "convertedExtractSha256",
  "converterProcedureSha256", "codebookRevision", "originalCaptureEvidenceSha256",
  "fieldMappingReviewEvidenceSha256", "rightsReviewEvidenceSha256",
  "conversionOperatorId", "sourceReviewerId", "mappingReviewerId",
  "rightsReviewerId", "rightsDisposition", "sourceObservedAt", "reviewRecordedAt",
] as const
const textEncoder = new TextEncoder()
const fail = (): never => { throw new Error("Unverified FJC signed review registry record") }
const timestamp = (v: unknown): number | null => {
  if (typeof v !== "string" || !UTC.test(v)) return null
  const n = Date.parse(v)
  return Number.isFinite(n) && new Date(n).toISOString().slice(0,19) + "Z" === v ? n : null
}
function exactFields(value: unknown, expected: readonly string[]): boolean {
  return value !== null && typeof value === "object" && !Array.isArray(value) &&
    Object.getOwnPropertySymbols(value).length === 0 &&
    Object.keys(value).length === expected.length &&
    expected.every(k => Object.prototype.hasOwnProperty.call(value, k))
}
function packetArray(packet: USFJCIndependentReleaseReviewPacket): string[] {
  if (!exactFields(packet,FIELDS)) return fail()
  const values=FIELDS.map(k => packet[k])
  if (values.some(v=>typeof v!=="string" || v.length===0 || v.length>2048)) return fail()
  return values
}
const bytesToHex=(bytes: Uint8Array)=>Array.from(bytes).map(x=>x.toString(16).padStart(2,"0")).join("")
function hexToBytes(value: string): Uint8Array {
  if (!/^(?:[0-9a-f]{2})+$/i.test(value)) return fail()
  return Uint8Array.from(value.match(/.{2}/g)!.map(x=>parseInt(x,16)))
}
async function digest(bytes: Uint8Array): Promise<string> {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)))
}

/** Identical domain-separated bytes must be signed/verified by the signer. */
export function buildUSFJCReviewSigningBytes(
  packet: USFJCIndependentReleaseReviewPacket,
  record: Pick<USFJCSignedReviewRecord,"sequence"|"previousDigest"|"signedAt">,
  signature: Pick<USFJCReviewSignature,"role"|"reviewerId"|"keyId">,
): Uint8Array {
  if (!record || !Number.isSafeInteger(record.sequence) || record.sequence<1 ||
      !HEX64.test(record.previousDigest) || timestamp(record.signedAt)===null ||
      !ROLES.some(role=>role===signature?.role) ||
      typeof signature.reviewerId!=="string" || !ID.test(signature.reviewerId) ||
      typeof signature.keyId!=="string" || !ID.test(signature.keyId)) return fail()
  return textEncoder.encode(JSON.stringify([
    "NEXJUD_USA_FJC_SIGNED_REVIEW_V1",record.sequence,record.previousDigest.toLowerCase(),
    record.signedAt,packetArray(packet),signature.role,signature.reviewerId,signature.keyId,
  ]))
}

/**
 * expectedPreviousDigest MUST be retrieved from separately controlled storage
 * (or be an independently authorized genesis checkpoint). Neither incoming
 * record nor reviewer key list can establish that registry's trust.
 */
export async function verifyUSFJCPinnedSignedReview(
  packet: USFJCIndependentReleaseReviewPacket,
  record: USFJCSignedReviewRecord,
  registry: USFJCIndependentReviewRegistry,
  /** Independently observed by the trusted server, never browser input. */
  serverReceivedAt: string,
): Promise<USFJCSignedReviewResult> {
  const received=timestamp(serverReceivedAt)
  const signed=timestamp(record?.signedAt)
  if (!record || !registry || received===null || signed===null || signed>received ||
      !Number.isSafeInteger(registry.expectedSequence) || registry.expectedSequence<1 ||
      record.sequence!==registry.expectedSequence ||
      !HEX64.test(registry.expectedPreviousDigest) ||
      record.previousDigest.toLowerCase()!==registry.expectedPreviousDigest.toLowerCase() ||
      !Array.isArray(record.signatures) || record.signatures.length!==3 ||
      !Array.isArray(registry.keys) || registry.keys.length!==3) return fail()

  const values=packetArray(packet)
  if (values.length!==FIELDS.length) return fail()
  const expectedIds=[packet.sourceReviewerId,packet.mappingReviewerId,packet.rightsReviewerId]
  if (new Set(expectedIds).size!==3 ||
      expectedIds.some(x=>!ID.test(x)) ||
      !HEX64.test(packet.originalReleaseSha256) ||
      !HEX64.test(packet.convertedExtractSha256)) return fail()

  const digestEntries: string[][]=[]
  const seenKeys=new Set<string>()
  for (let index=0;index<3;index++) {
    const role=ROLES[index]
    const signature=record.signatures[index]
    const key=registry.keys[index]
    if (!exactFields(signature,["role","reviewerId","keyId","signatureHex"]) ||
        !exactFields(key,["role","reviewerId","keyId","pinnedSpkiSha256",
                          "spkiBytes","activatedAt","expiresAt","revokedAt"]) ||
        signature.role!==role || key.role!==role ||
        signature.reviewerId!==expectedIds[index] ||
        key.reviewerId!==expectedIds[index] ||
        signature.keyId!==key.keyId ||
        !ID.test(key.keyId) || seenKeys.has(key.keyId) ||
        !HEX64.test(key.pinnedSpkiSha256) ||
        typeof signature.signatureHex!=="string" ||
        !/^[0-9a-f]{128}$/i.test(signature.signatureHex) ||
        !(key.spkiBytes instanceof Uint8Array) ||
        key.spkiBytes.byteLength<64 || key.spkiBytes.byteLength>512) return fail()
    seenKeys.add(key.keyId)
    const from=timestamp(key.activatedAt),until=timestamp(key.expiresAt)
    const revoked=key.revokedAt===null?null:timestamp(key.revokedAt)
    if (from===null || until===null || from>=until ||
        signed<from || signed>=until || received<from || received>=until ||
        (key.revokedAt!==null && revoked===null) ||
        (revoked!==null && (revoked<from || signed>=revoked || received>=revoked))) return fail()

    const pinned=await digest(key.spkiBytes)
    if (pinned!==key.pinnedSpkiSha256.toLowerCase()) return fail()
    let valid=false
    try {
      const publicKey=await crypto.subtle.importKey("spki",key.spkiBytes,{
        name:"ECDSA",namedCurve:"P-256",
      },false,["verify"])
      const signedBytes=buildUSFJCReviewSigningBytes(packet,record,signature)
      valid=await crypto.subtle.verify({name:"ECDSA",hash:"SHA-256"},
        publicKey,hexToBytes(signature.signatureHex),signedBytes)
    } catch { return fail() }
    if (!valid) return fail()
    digestEntries.push([role,signature.reviewerId,signature.keyId,signature.signatureHex.toLowerCase()])
  }
  // Integrity fingerprint ONLY: no actual append-only storage or finality.
  const fingerprint=textEncoder.encode(JSON.stringify([
    "NEXJUD_USA_FJC_REVIEW_LINK_V1",record.sequence,
    record.previousDigest.toLowerCase(),record.signedAt,values,digestEntries,
  ]))
  return {
    status:"THREE_PINNED_REVIEW_SIGNATURES_VERIFIED",
    linkedRecordDigest:await digest(fingerprint),
    rolesVerified:["source","mapping","rights"],
    registryLinkMatched:true,pinnedReviewerKeysVerified:true,
    reviewerRealWorldIdentityVerified:false,immutableLedgerPersistenceVerified:false,
    officialFJCReleaseAuthenticated:false,legalUseRightsCertified:false,
    caseOutcomePredictionApproved:false,
  }
}
