import type { EnterpriseCaseImportRequest } from "./apiContracts"

/** Secondary in-process limits; enforce request byte limit at the HTTP gateway too. */
export function validateImportPayloadLimits(request: EnterpriseCaseImportRequest): string[] {
  const errors: string[] = []
  if (!request || typeof request !== "object") return ["Payload inválido."]
  if (typeof request.idempotencyKey !== "string" || request.idempotencyKey.length > 128) {
    errors.push("Chave de idempotência inválida.")
  }
  if (!Array.isArray(request.items)) return [...errors, "Lista de processos inválida."]
  if (request.items.length > 100) return [...errors, "Lote excede 100 processos."]
  for (const [index, item] of request.items.entries()) {
    if (!item || typeof item !== "object") {
      errors.push(`Processo ${index + 1}: objeto inválido.`)
      continue
    }
    for (const field of ["organizationId", "externalId", "sourceSystem", "cnjNumber"] as const) {
      if (typeof item[field] !== "string" || item[field].length > 256) {
        errors.push(`Processo ${index + 1}: campo ${field} inválido.`)
      }
    }
    if (item.metadata !== undefined) {
      // Metadata is excluded from the canonical fingerprint and persistence plan.
      // Reject until both include it, avoiding inconsistent idempotent replays.
      errors.push(`Processo ${index + 1}: metadados ainda não suportados na importação.`)
    }
  }
  return errors
}
