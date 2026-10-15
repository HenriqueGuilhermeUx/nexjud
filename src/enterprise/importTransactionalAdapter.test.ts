import { describe, expect, it, vi } from "vitest"
import { createTransactionalImportPersistence, type ImportTransaction } from "./importTransactionalAdapter"
import { ImportIdempotencyConflict } from "./importIdempotencyConflict"

const receipt = {
  organizationId: "org-a",
  idempotencyKey: "batch-a",
  itemCount: 1,
  actorId: "user-a",
  plannedAt: "2026-10-14T12:00:00.000Z",
}
const input = {
  plan: {
    organizationId: "org-a", idempotencyKey: "batch-a",
    uniqueCases: [{ externalId: "case-a", sourceSystem: "erp", cnjDigits: "00000000002026826000" }],
  },
  audit: {
    action: "enterprise.case_import.planned" as const,
    organizationId: "org-a", idempotencyKey: "batch-a", actorId: "user-a",
    itemCount: 1, recordedAt: receipt.plannedAt,
  },
  receipt,
  requestFingerprint: "sha256:" + "a".repeat(64),
}

describe("transactional import adapter", () => {
  it("rechecks authorization then persists only for new reservations", async () => {
    const calls: string[] = []
    const tx: ImportTransaction = {
      assertCanImport: async () => { calls.push("authorize") },
      reserveOrFind: async () => { calls.push("reserve"); return { kind: "reserved" } },
      persist: async () => { calls.push("persist") },
    }
    const persistence = createTransactionalImportPersistence({
      transaction: async (work) => { calls.push("begin"); const result = await work(tx); calls.push("commit"); return result },
    })
    await expect(persistence.commit(input)).resolves.toEqual({ status: "created", receipt })
    expect(calls).toEqual(["begin", "authorize", "reserve", "persist", "commit"])
  })

  it("returns the original receipt on exact replay without persisting", async () => {
    const original = { ...receipt, actorId: "original-actor", plannedAt: "2026-10-01T10:00:00.000Z" }
    const persist = vi.fn()
    const persistence = createTransactionalImportPersistence({
      transaction: async (work) => work({
        assertCanImport: async () => {},
        reserveOrFind: async () => ({ kind: "existing", fingerprint: input.requestFingerprint, receipt: original }),
        persist,
      }),
    })
    await expect(persistence.commit(input)).resolves.toEqual({ status: "already_processed", receipt: original })
    expect(persist).not.toHaveBeenCalled()
  })

  it("raises typed conflict and never writes on mismatched fingerprint", async () => {
    const persist = vi.fn()
    const persistence = createTransactionalImportPersistence({
      transaction: async (work) => work({
        assertCanImport: async () => {},
        reserveOrFind: async () => ({ kind: "existing", fingerprint: "sha256:" + "b".repeat(64), receipt }),
        persist,
      }),
    })
    await expect(persistence.commit(input)).rejects.toBeInstanceOf(ImportIdempotencyConflict)
    expect(persist).not.toHaveBeenCalled()
  })

  it("does not reserve or persist if authorization fails", async () => {
    const reserveOrFind = vi.fn()
    const persist = vi.fn()
    const persistence = createTransactionalImportPersistence({
      transaction: async (work) => work({
        assertCanImport: async () => { throw new Error("revoked") },
        reserveOrFind,
        persist,
      }),
    })
    await expect(persistence.commit(input)).rejects.toThrow("revoked")
    expect(reserveOrFind).not.toHaveBeenCalled()
    expect(persist).not.toHaveBeenCalled()
  })
})
