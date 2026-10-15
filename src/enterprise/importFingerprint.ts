import type { ImportPlan } from "./importPlanner"

/**
 * Stable canonical payload for a server-computed SHA-256 digest.
 * Never trust a fingerprint supplied by the client.
 * This intentionally preserves case ordering and normalized values.
 */
export function canonicalImportPayload(plan: ImportPlan): string {
  if (!plan.organizationId.trim() || !plan.idempotencyKey.trim()) {
    throw new Error("Plano de importação inválido.")
  }
  return JSON.stringify({
    version: 1,
    organizationId: plan.organizationId,
    cases: plan.uniqueCases.map(({ externalId, cnjDigits, sourceSystem }) => ({
      externalId,
      cnjDigits,
      sourceSystem,
    })),
  })
}

export function validateImportFingerprint(value: string): void {
  if (!/^sha256:[a-f0-9]{64}$/.test(value)) {
    throw new Error("Fingerprint SHA-256 inválido.")
  }
}
