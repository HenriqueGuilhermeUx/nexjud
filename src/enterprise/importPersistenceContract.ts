import type { ImportPlan } from "./importPlanner"
import type { ImportAuditRecord } from "./importAudit"
import type { ImportReceipt } from "./importReceipt"

export type ImportCommitResult =
  | { status: "created"; receipt: ImportReceipt }
  | { status: "already_processed"; receipt: ImportReceipt }

export type ImportPersistence = {
  /**
   * Server-only implementation. MUST atomically:
   * - validate authenticated actor and tenant membership in database;
   * - lock or uniquely insert (organizationId, idempotencyKey);
   * - compare immutable request fingerprint for key reuse;
   * - persist case upserts, audit and receipt in one transaction;
   * - return the original receipt on exact replay.
   * No network side effects within transaction; enqueue webhooks to outbox.
   */
  commit(input: {
    plan: ImportPlan
    audit: ImportAuditRecord
    receipt: ImportReceipt
    requestFingerprint: string
  }): Promise<ImportCommitResult>
}

export function assertImportCommitInput(input: {
  plan: ImportPlan
  audit: ImportAuditRecord
  receipt: ImportReceipt
  requestFingerprint: string
}): void {
  const { plan, audit, receipt, requestFingerprint } = input
  if (!plan.organizationId || !plan.idempotencyKey || !audit.actorId || !requestFingerprint.trim()) {
    throw new Error("Persistência requer contexto e fingerprint.")
  }
  if (plan.organizationId !== audit.organizationId || plan.organizationId !== receipt.organizationId ||
      plan.idempotencyKey !== audit.idempotencyKey || plan.idempotencyKey !== receipt.idempotencyKey ||
      plan.uniqueCases.length !== audit.itemCount || audit.itemCount !== receipt.itemCount ||
      audit.actorId !== receipt.actorId || audit.recordedAt !== receipt.plannedAt) {
    throw new Error("Dados transacionais inconsistentes.")
  }
}
