export type ImportPayload = {
  organizationId: string
  idempotencyKey: string
  items: Array<{ externalId: string; sourceSystem: string; cnjDigits: string }>
}
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)
export function validateImportPayload(value: unknown): value is ImportPayload {
  if (!isRecord(value) ||
      Object.keys(value).some(k => !["organizationId", "idempotencyKey", "items"].includes(k)) ||
      typeof value.organizationId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.organizationId) ||
      typeof value.idempotencyKey !== "string" ||
      value.idempotencyKey.trim().length < 1 || value.idempotencyKey.length > 128 ||
      !Array.isArray(value.items) || value.items.length < 1 || value.items.length > 500) return false
  return value.items.every(item => isRecord(item) &&
    Object.keys(item).length === 3 &&
    typeof item.externalId === "string" && item.externalId.trim().length > 0 && item.externalId.length <= 160 &&
    typeof item.sourceSystem === "string" && item.sourceSystem.trim().length > 0 && item.sourceSystem.length <= 160 &&
    typeof item.cnjDigits === "string" && /^\d{20}$/.test(item.cnjDigits))
}
