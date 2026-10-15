// Safe, Expo-compatible view model for the author-scoped Enterprise history RPC.
export type ImportBatch = {
  batchId: string
  idempotencyKey: string
  itemCount: number
  linkedCaseCount: number
  createdAt: string
}
export function normalizeImportHistory(data: unknown): ImportBatch[] | null {
  if (!Array.isArray(data) || data.length > 50) return null
  const result: ImportBatch[] = []
  for (const raw of data) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null
    const row = raw as Partial<ImportBatch>
    if (typeof row.batchId !== "string" ||
        typeof row.idempotencyKey !== "string" ||
        typeof row.createdAt !== "string" ||
        typeof row.itemCount !== "number" || !Number.isSafeInteger(row.itemCount) || row.itemCount < 0 ||
        typeof row.linkedCaseCount !== "number" || !Number.isSafeInteger(row.linkedCaseCount) ||
        row.linkedCaseCount < 0 || row.linkedCaseCount > row.itemCount) return null
    result.push({
      batchId: row.batchId, idempotencyKey: row.idempotencyKey,
      itemCount: row.itemCount, linkedCaseCount: row.linkedCaseCount,
      createdAt: row.createdAt,
    })
  }
  return result
}
