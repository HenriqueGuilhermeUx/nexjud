import type { EnterpriseWebhookEnvelope } from "./apiContracts"
import { retryDelayMs } from "./webhookDeliveryPolicy"

export type OutboxState = "pending" | "delivered" | "dead_letter"
export type OutboxRecord = {
  event: EnterpriseWebhookEnvelope
  state: OutboxState
  attempts: number
  nextAttemptAt: string | null
}

export function scheduleOutboxFailure(record: OutboxRecord, failedAt: Date): OutboxRecord {
  if (record.state !== "pending") throw new Error("Evento não está pendente.")
  if (!Number.isFinite(failedAt.getTime())) throw new Error("Data inválida.")
  if (!Number.isInteger(record.attempts) || record.attempts < 0 || record.attempts >= 5) {
    throw new Error("Número de tentativas inválido.")
  }
  const attempts = record.attempts + 1
  return {
    ...record,
    attempts,
    state: attempts >= 5 ? "dead_letter" : "pending",
    nextAttemptAt: attempts >= 5 ? null : new Date(failedAt.getTime() + retryDelayMs(attempts)).toISOString(),
  }
}

export function markOutboxDelivered(record: OutboxRecord): OutboxRecord {
  if (record.state !== "pending") throw new Error("Evento não está pendente.")
  return { ...record, state: "delivered", nextAttemptAt: null }
}
