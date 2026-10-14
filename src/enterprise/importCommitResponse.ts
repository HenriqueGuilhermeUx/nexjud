import type { ImportCommitResult } from "./importPersistenceContract"
import type { ImportReceipt } from "./importReceipt"

/** Fail closed if a persistence adapter returns another tenant's receipt. */
export function assertImportCommitResult(
  expected: ImportReceipt,
  result: ImportCommitResult,
): void {
  if (result.status !== "created" && result.status !== "already_processed") {
    throw new Error("Status de importação inválido.")
  }
  if (!result.receipt ||
      result.receipt.organizationId !== expected.organizationId ||
      result.receipt.idempotencyKey !== expected.idempotencyKey ||
      result.receipt.itemCount !== expected.itemCount) {
    throw new Error("Resultado de importação fora do escopo esperado.")
  }
  if (result.status === "created" &&
      (result.receipt.actorId !== expected.actorId || result.receipt.plannedAt !== expected.plannedAt)) {
    throw new Error("Recibo de criação inconsistente.")
  }
  // On exact replay, the original actor and timestamp must be retained.
}
