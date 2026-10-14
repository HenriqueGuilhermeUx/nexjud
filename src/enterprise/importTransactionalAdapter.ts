import type { ImportPersistence, ImportCommitResult } from "./importPersistenceContract"
import type { ImportReceipt } from "./importReceipt"
import { assertImportCommitInput } from "./importPersistenceContract"
import { ImportIdempotencyConflict } from "./importIdempotencyConflict"

/**
 * Server-only database port. Implementations MUST open a real database
 * transaction and lock/insert the unique (organization, idempotency) key.
 * No browser-facing client or SQL implementation is provided here.
 */
export type ImportTransaction = {
  /** Recheck JWT-derived actor's active membership/role INSIDE the transaction. */
  assertCanImport(organizationId: string, actorId: string): Promise<void>
  /** Must serialize concurrent writers using a unique constraint/row lock. */
  reserveOrFind(
    organizationId: string,
    idempotencyKey: string,
    fingerprint: string,
  ): Promise<{ kind: "reserved" } | { kind: "existing"; fingerprint: string; receipt: ImportReceipt }>
  /** Persist batch, items, receipt and audit atomically. */
  persist(input: Parameters<ImportPersistence["commit"]>[0]): Promise<void>
}

export type ImportTransactionalDatabase = {
  transaction<T>(work: (tx: ImportTransaction) => Promise<T>): Promise<T>
}

/** Pure orchestration: the database port owns transaction isolation and durability. */
export function createTransactionalImportPersistence(
  database: ImportTransactionalDatabase,
): ImportPersistence {
  return {
    async commit(input): Promise<ImportCommitResult> {
      assertImportCommitInput(input)
      return database.transaction(async (tx) => {
        await tx.assertCanImport(input.plan.organizationId, input.audit.actorId)
        const decision = await tx.reserveOrFind(
          input.plan.organizationId,
          input.plan.idempotencyKey,
          input.requestFingerprint,
        )
        if (decision.kind === "existing") {
          if (decision.fingerprint !== input.requestFingerprint) {
            throw new ImportIdempotencyConflict()
          }
          return { status: "already_processed", receipt: decision.receipt }
        }
        await tx.persist(input)
        return { status: "created", receipt: input.receipt }
      })
    },
  }
}
