/**
 * NexJud USA: OFFLINE FJC conversion replay against frozen bytes.
 *
 * The runner MUST be provided by a server-owned, independently reviewed
 * environment. It receives copies of the original input. A browser-provided
 * callback, executable bytes, or review packet is NOT trusted evidence.
 *
 * Hashing an artifact and replaying an injected callback CANNOT prove that
 * the callback actually executed that artifact; accordingly the output
 * explicitly refuses executable attestation, publisher authentication,
 * licensed data rights, historic snapshots, and predictive approval.
 */
import { verifyFJCSourceDigest } from "./fjcSnapshotDigest"
import type { USFJCIndependentReleaseReviewPacket } from "./fjcSourceLineagePreflight"

export interface USFJCConversionReplayRequest {
  /** Pinned externally and loaded by the OFFLINE operator, not a web request. */
  reviewedConverterArtifactBytes: Uint8Array
  /**
   * Trusted server-side adapter ONLY. MUST implement the operator-reviewed
   * deterministic conversion over original bytes, without reading the
   * expected result. This contract cannot enforce process isolation.
   */
  replayConverter(originalReleaseCopy: Uint8Array): Promise<Uint8Array>
}

export interface USFJCConversionReplayReport {
  status: "REPLAY_BYTE_IDENTICAL"
  converterArtifactDigestMatchesReviewPacket: true
  twoFreshReplayOutputsByteIdentical: true
  originalInputCopiesUnchanged: true
  /** Requires attestation of the actual running executable, not present. */
  executedConverterArtifactAttested: false
  publisherReleaseAuthenticated: false
  legalUseRightsCertified: false
  independentHistoricalSnapshotVerified: false
  legalCaseOutcomePredictionApproved: false
}

const exactBytes = (a: Uint8Array, b: Uint8Array): boolean => {
  if (a.length !== b.length) return false
  for (let i=0; i<a.length; i++) if (a[i] !== b[i]) return false
  return true
}

export async function verifyUSFJCByteIdenticalConversionReplay(
  originalReleaseBytes: Uint8Array,
  expectedConvertedBytes: Uint8Array,
  packet: USFJCIndependentReleaseReviewPacket,
  request: USFJCConversionReplayRequest,
): Promise<USFJCConversionReplayReport> {
  const fail = (): never => { throw new Error("FJC offline conversion replay verification failed") }
  if (!(originalReleaseBytes instanceof Uint8Array) ||
      originalReleaseBytes.length < 1 || originalReleaseBytes.length > 50_000_000 ||
      !(expectedConvertedBytes instanceof Uint8Array) ||
      expectedConvertedBytes.length < 2 || expectedConvertedBytes.length > 8_000_000 ||
      !(request?.reviewedConverterArtifactBytes instanceof Uint8Array) ||
      request.reviewedConverterArtifactBytes.length < 1 ||
      request.reviewedConverterArtifactBytes.length > 8_000_000 ||
      typeof request.replayConverter !== "function" || !packet ||
      !(await verifyFJCSourceDigest(originalReleaseBytes, packet.originalReleaseSha256)) ||
      !(await verifyFJCSourceDigest(expectedConvertedBytes, packet.convertedExtractSha256)) ||
      !(await verifyFJCSourceDigest(
        request.reviewedConverterArtifactBytes, packet.converterProcedureSha256,
      ))) return fail()

  // Snapshot each input before invoking the injected runner. Otherwise a
  // converter could mutate arrays the subsequent parser will read.
  const source = originalReleaseBytes.slice()
  const expected = expectedConvertedBytes.slice()
  const reviewedArtifact = request.reviewedConverterArtifactBytes.slice()
  const pinnedConverterDigest = packet.converterProcedureSha256
  for (let i=0; i<2; i++) {
    const fresh = source.slice()
    let converted: Uint8Array
    try {
      converted = await request.replayConverter(fresh)
    } catch {
      return fail()
    }
    if (!(converted instanceof Uint8Array) ||
        converted.byteLength < 2 || converted.byteLength > 8_000_000 ||
        !exactBytes(fresh, source) ||
        !exactBytes(originalReleaseBytes, source) ||
        !exactBytes(expectedConvertedBytes, expected) ||
        !exactBytes(request.reviewedConverterArtifactBytes, reviewedArtifact) ||
        packet.converterProcedureSha256 !== pinnedConverterDigest ||
        !exactBytes(converted, expected)) return fail()
  }
  return {
    status: "REPLAY_BYTE_IDENTICAL",
    converterArtifactDigestMatchesReviewPacket: true,
    twoFreshReplayOutputsByteIdentical: true,
    originalInputCopiesUnchanged: true,
    executedConverterArtifactAttested: false,
    publisherReleaseAuthenticated: false,
    legalUseRightsCertified: false,
    independentHistoricalSnapshotVerified: false,
    legalCaseOutcomePredictionApproved: false,
  }
}
