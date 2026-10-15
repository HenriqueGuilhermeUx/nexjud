import type { ImportPlan } from "./importPlanner"
import type { ImportAuditRecord } from "./importAudit"

export type ImportReceipt = {
  organizationId: string
  idempotencyKey: string
  itemCount: number
  actorId: string
  plannedAt: string
}

/** Returns a minimal receipt; never exposes process payloads. */
export function createImportReceipt(plan: ImportPlan, audit: ImportAuditRecord): ImportReceipt {
  if (plan.organizationId !== audit.organizationId || plan.idempotencyKey !== audit.idempotencyKey) {
    throw new Error("Recibo e auditoria pertencem a operações diferentes.")
  }
  if (plan.uniqueCases.length !== audit.itemCount) {
    throw new Error("Quantidade de processos divergente.")
  }
  return {
    organizationId: plan.organizationId,
    idempotencyKey: plan.idempotencyKey,
    itemCount: audit.itemCount,
    actorId: audit.actorId,
    plannedAt: audit.recordedAt,
  }
}
