import { describe, expect, it } from "vitest"
import { createWebhookDeliveryPolicy, retryDelayMs } from "./webhookDeliveryPolicy"

const event = {
  id: "event-1",
  version: "v1" as const,
  organizationId: "org-a",
  type: "case.created" as const,
  occurredAt: "2026-10-14T12:00:00Z",
  resourceId: "case-a",
}

describe("Enterprise webhook delivery policy", () => {
  it("builds bounded delivery settings", () => {
    const policy = createWebhookDeliveryPolicy("https://hooks.acme.com/events", event)
    expect(policy.maxAttempts).toBe(5)
    expect(policy.timeoutMs).toBe(10_000)
  })
  it("rejects invalid destinations", () => {
    expect(() => createWebhookDeliveryPolicy("http://localhost", event)).toThrow()
  })
  it("rejects events without tenant", () => {
    expect(() => createWebhookDeliveryPolicy("https://hooks.acme.com/events", { ...event, organizationId: "" })).toThrow()
  })
  it("uses bounded exponential retry delays", () => {
    expect([1, 2, 3, 4, 5].map(retryDelayMs)).toEqual([1000, 2000, 4000, 8000, 16000])
  })
  it("rejects out-of-range retry counts", () => {
    expect(() => retryDelayMs(0)).toThrow()
    expect(() => retryDelayMs(6)).toThrow()
  })
})
