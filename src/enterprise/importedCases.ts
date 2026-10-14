export type EnterpriseImportedCase = {
  id: string
  title: string
  processNumber: string | null
  sourceSystem: string
  externalId: string
  createdAt: string | null
}
function record(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x)
}
export function parseImportedCase(
  input: unknown,
  organizationId: string,
  userId: string,
): EnterpriseImportedCase | null {
  if (!record(input) || input.user_id !== userId ||
      typeof input.id !== "string" || typeof input.title !== "string" ||
      (input.process_number !== null && typeof input.process_number !== "string") ||
      (input.created_at !== null && typeof input.created_at !== "string")) return null
  if (!record(input.metadata) || !record(input.metadata.enterpriseImport)) return null
  const info = input.metadata.enterpriseImport
  if (info.organizationId !== organizationId ||
      typeof info.sourceSystem !== "string" || !info.sourceSystem ||
      typeof info.externalId !== "string" || !info.externalId) return null
  return {
    id: input.id,
    title: input.title,
    processNumber: typeof input.process_number === "string" ? input.process_number : null,
    sourceSystem: info.sourceSystem,
    externalId: info.externalId,
    createdAt: typeof input.created_at === "string" ? input.created_at : null,
  }
}
