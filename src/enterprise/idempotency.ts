/**
 * Deterministic namespace for deduplicating import requests.
 * Persistence must enforce UNIQUE(organization_id, idempotency_key)
 * atomically on the server. Never use this as an authorization check.
 */
export function buildImportIdempotencyScope(
  organizationId: string,
  idempotencyKey: string,
): string {
  const org = organizationId.trim()
  const key = idempotencyKey.trim()
  if (!org || !key) throw new Error("Organização e chave de idempotência obrigatórias.")
  if (org.length > 128 || key.length > 256) throw new Error("Identificador de idempotência excede o limite.")
  return JSON.stringify([org, key])
}
