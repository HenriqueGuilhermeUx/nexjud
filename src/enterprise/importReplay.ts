import { validateImportFingerprint } from "./importFingerprint"

export type ImportReplayDecision = "new" | "replay" | "conflict"

/**
 * Compare fingerprints scoped to one organization + idempotency key.
 * The database must provide the existing fingerprint under an atomic lock.
 */
export function decideImportReplay(
  incomingFingerprint: string,
  existingFingerprint: string | null,
): ImportReplayDecision {
  validateImportFingerprint(incomingFingerprint)
  if (existingFingerprint === null) return "new"
  validateImportFingerprint(existingFingerprint)
  return incomingFingerprint === existingFingerprint ? "replay" : "conflict"
}
