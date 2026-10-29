/**
 * USA / FJC. Strictly OFFLINE import of an approved JSON-formatted extract.
 *
 * This does not assume the native FJC download is JSON: an independent,
 * version-reviewed converter must first transform the official data. The
 * entire converted artifact must be frozen and hashed by the operator.
 *
 * Digest verification is tied to the EXACT bytes subsequently decoded and
 * normalized, not a loose manifest check. No network, DB, or provider calls.
 */
import { normalizeFJCCivilExtract, type FJCCivilManifest, type FJCNormalizedCivilCase } from "./fjcCivilCohort"
import { verifyFJCSourceDigest } from "./fjcSnapshotDigest"

export interface VerifiedFJCSnapshot {
  sourceSha256: string
  datasetId: string
  revision: string
  asOfDate: string
  records: FJCNormalizedCivilCase[]
  sourceIntegrityChecked: true
  /** Only byte integrity checked; source provenance / rights still reviewed separately. */
  sourceAuthenticityCertified: false
  modelTrained: false
}

export async function loadVerifiedFJCJsonSnapshot(
  bytes: Uint8Array,
  manifest: FJCCivilManifest,
): Promise<VerifiedFJCSnapshot> {
  // Require concrete limits before decode; fail closed for invalid byte input.
  if (!(bytes instanceof Uint8Array) || bytes.byteLength < 2 || bytes.byteLength > 8_000_000) {
    throw new Error("FJC JSON snapshot outside supported size")
  }
  if (!await verifyFJCSourceDigest(bytes, manifest?.releaseSha256)) {
    throw new Error("FJC snapshot SHA-256 mismatch")
  }
  // Fatal UTF-8 decode prevents lossy substitution of record identifiers.
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
  let parsed: unknown
  try { parsed = JSON.parse(text) } catch { throw new Error("Invalid FJC converted JSON") }
  if (!Array.isArray(parsed)) throw new Error("FJC converted artifact must be a JSON row array")
  const records = normalizeFJCCivilExtract(parsed, manifest)
  return {
    sourceSha256: manifest.releaseSha256.toLowerCase(),
    datasetId: manifest.datasetId,
    revision: manifest.revision,
    asOfDate: manifest.asOfDate,
    records,
    sourceIntegrityChecked: true,
    sourceAuthenticityCertified: false,
    modelTrained: false,
  }
}
