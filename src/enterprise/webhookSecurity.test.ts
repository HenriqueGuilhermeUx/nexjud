import { describe, expect, it } from "vitest"
import { validateWebhookDestination, validateWebhookEnvelope } from "./webhookSecurity"

describe("webhook destination validation", () => {
  it("accepts a public HTTPS domain", () => {
    expect(validateWebhookDestination("https://hooks.example.com/events").hostname).toBe("hooks.example.com")
  })
  it.each([
    "http://hooks.example.com/events",
    "https://localhost/events",
    "https://127.0.0.1/events",
    "https://[::1]/events",
    "https://metadata.google.internal/latest",
    "https://user:pass@hooks.example.com/events",
    "https://hooks.example.com:8443/events",
    "https://hooks.example.com/events#fragment",
  ])("rejects unsafe destination %s", (destination) => {
    expect(() => validateWebhookDestination(destination)).toThrow()
  })
})

describe("webhook event envelope", () => {
  const event = {
    id: "event-1",
    version: "v1" as const,
    organizationId: "org-1",
    type: "case.created" as const,
    occurredAt: "2026-10-14T12:00:00Z",
    resourceId: "case-1",
  }
  it("accepts valid event", () => {
    expect(() => validateWebhookEnvelope(event)).not.toThrow()
  })
  it("rejects missing tenant", () => {
    expect(() => validateWebhookEnvelope({ ...event, organizationId: "" })).toThrow()
  })
  it("rejects invalid event date", () => {
    expect(() => validateWebhookEnvelope({ ...event, occurredAt: "not-a-date" })).toThrow()
  })
})
