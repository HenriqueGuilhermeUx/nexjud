import { EnterpriseCaseImportRequest, validateImportRequest } from "./apiContracts"

export type ImportPlan = {
  organizationId: string
  idempotencyKey: string
  uniqueCases: Array<{ externalId: string; cnjDigits: string; sourceSystem: string }>
}

export function planEnterpriseImport(request: EnterpriseCaseImportRequest): ImportPlan {
  const errors = validateImportRequest(request)
  if (errors.length) throw new Error(errors.join(" "))
  const organizationIds = new Set(request.items.map((item) => item.organizationId))
  if (organizationIds.size !== 1) {
    throw new Error("Um lote deve pertencer a uma única organização.")
  }
  const organizationId = request.items[0].organizationId
  return {
    organizationId,
    idempotencyKey: request.idempotencyKey.trim(),
    uniqueCases: request.items.map((item) => ({
      externalId: item.externalId.trim(),
      cnjDigits: item.cnjNumber.replace(/\D/g, ""),
      sourceSystem: item.sourceSystem.trim(),
    })),
  }
}
