import type { ImportPlan } from "./importPlanner"

export type ImportAuditRecord = {
  action: "enterprise.case_import.planned"
  organizationId: string
  actorId: string
  idempotencyKey: string
  itemCount: number
  recordedAt: string
}

/** Metadata only: do not log process contents, names, CPF or documents. */
export function createImportAuditRecord(
  plan: ImportPlan,
  actorId: string,
  recordedAt: Date,
): ImportAuditRecord {
  if (!actorId.trim() || !plan.organizationId.trim() || !plan.idempotencyKey.trim()) {
    throw new Error("Auditoria requer usuário e identificadores.")
  }
  if (!Number.isFinite(recordedAt.getTime())) throw new Error("Data de auditoria inválida.")
  return {
    action: "enterprise.case_import.planned",
    organizationId: plan.organizationId,
    actorId: actorId.trim(),
    idempotencyKey: plan.idempotencyKey,
    itemCount: plan.uniqueCases.length,
    recordedAt: recordedAt.toISOString(),
  }
}
