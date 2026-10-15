import type { EnterpriseWebhookEnvelope } from "./apiContracts"
import { validateWebhookDestination, validateWebhookEnvelope } from "./webhookSecurity"

export type WebhookDeliveryPolicy = {
  destination: string
  event: EnterpriseWebhookEnvelope
  maxAttempts: number
  timeoutMs: number
}

/**
 * Produces a safe delivery policy, not a network request.
 * Actual delivery requires server-side HMAC, DNS/IP SSRF checks,
 * no redirects, per-tenant secret management, and an outbox.
 */
export function createWebhookDeliveryPolicy(
  destination: string,
  event: EnterpriseWebhookEnvelope,
): WebhookDeliveryPolicy {
  validateWebhookEnvelope(event)
  const url = validateWebhookDestination(destination)
  return {
    destination: url.toString(),
    event,
    maxAttempts: 5,
    timeoutMs: 10_000,
  }
}

export function retryDelayMs(attemptNumber: number): number {
  if (!Number.isInteger(attemptNumber) || attemptNumber < 1 || attemptNumber > 5) {
    throw new Error("Tentativa inválida.")
  }
  return Math.min(60_000, 1000 * 2 ** (attemptNumber - 1))
}
