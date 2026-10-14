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
      // Metadata is not included in canonicalImportPayload yet.
      // Reject it until the persisted payload and fingerprint cover the same fields.
      errors.push(`Processo ${index + 1}: metadados ainda não suportados na importação.`)
      if (!item.metadata || typeof item.metadata !== "object" || Array.isArray(item.metadata) ||
          Object.keys(item.metadata).length > 20) {
        errors.push(`Processo ${index + 1}: metadados inválidos.`)
      } else {
        for (const [key, value] of Object.entries(item.metadata)) {
          if (key.length > 64 || !/^[a-zA-Z0-9_.-]+$/.test(key) ||
              !(value === null || typeof value === "boolean" ||
                (typeof value === "number" && Number.isFinite(value)) ||
                (typeof value === "string" && value.length <= 2048))) {
            errors.push(`Processo ${index + 1}: metadados fora dos limites.`)
            break
          }
        }
      }
    }
  }
  return errors
}
