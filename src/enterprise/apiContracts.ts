/**
 * Shared contracts for NexJud app and future Enterprise API.
 * This file defines types only; no endpoint is exposed yet.
 */
export const ENTERPRISE_API_VERSION = "v1" as const

export type EnterpriseCaseInput = {
  externalId: string
  cnjNumber: string
  organizationId: string
  sourceSystem: string
  metadata?: Record<string, string | number | boolean | null>
}

export type EnterpriseCaseImportRequest = {
  idempotencyKey: string
  items: EnterpriseCaseInput[]
}

export type EnterpriseImportItemResult = {
  externalId: string
  status: "created" | "updated" | "skipped" | "rejected"
  caseId?: string
  reason?: string
}

export type EnterpriseCaseImportResponse = {
  jobId: string
  organizationId: string
  results: EnterpriseImportItemResult[]
}

export type EnterpriseEventType =
  | "case.created"
  | "case.updated"
  | "case.task_due"
  | "case.review_requested"
  | "case.review_completed"

export type EnterpriseWebhookEnvelope = {
  id: string
  version: typeof ENTERPRISE_API_VERSION
  organizationId: string
  type: EnterpriseEventType
  occurredAt: string
  resourceId: string
}

/** Client-side shape validation is not authorization. */
export function validateImportRequest(request: EnterpriseCaseImportRequest): string[] {
  const errors: string[] = []
  if (!request.idempotencyKey?.trim()) errors.push("Chave de idempotência obrigatória.")
  if (!Array.isArray(request.items) || request.items.length === 0) {
    errors.push("O lote precisa conter processos.")
    return errors
  }
  if (request.items.length > 100) errors.push("O lote excede 100 processos.")
  const keys = new Set<string>()
  for (const [index, item] of request.items.entries()) {
    if (!item.organizationId?.trim() || !item.externalId?.trim() || !item.sourceSystem?.trim()) {
      errors.push(`Processo ${index + 1}: identificadores obrigatórios ausentes.`)
    }
    const digits = item.cnjNumber?.replace(/\D/g, "") ?? ""
    if (!/^\d{20}$/.test(digits)) errors.push(`Processo ${index + 1}: CNJ deve conter 20 dígitos.`)
    const key = [item.organizationId, item.sourceSystem, item.externalId].join(":")
    if (keys.has(key)) errors.push(`Processo ${index + 1}: identificador duplicado no lote.`)
    keys.add(key)
  }
  return errors
}
