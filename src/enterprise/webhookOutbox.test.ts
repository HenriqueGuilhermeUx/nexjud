import { describe, expect, it } from "vitest"
import { markOutboxDelivered, scheduleOutboxFailure, type OutboxRecord } from "./webhookOutbox"

const record: OutboxRecord = {
  event: { id: "e1", version: "v1", organizationId: "org-a", type: "case.created", occurredAt: "2026-10-14T12:00:00Z", resourceId: "case-a" },
  state: "pending",
  attempts: 0,
  nextAttemptAt: null,
}

describe("Enterprise webhook outbox state", () => {
  it("schedules next attempt after a failure", () => {
    const result = scheduleOutboxFailure(record, new Date("2026-10-14T12:00:00Z"))
    expect(result.attempts).toBe(1)
    expect(result.nextAttemptAt).toBe("2026-10-14T12:00:01.000Z")
  })
  it("moves to dead letter after fifth failure", () => {
    const result = scheduleOutboxFailure({ ...record, attempts: 4 }, new Date("2026-10-14T12:00:00Z"))
    expect(result.state).toBe("dead_letter")
    expect(result.nextAttemptAt).toBeNull()
  })
  it("marks pending events delivered", () => {
    expect(markOutboxDelivered(record).state).toBe("delivered")
  })
  it("rejects retry of delivered event", () => {
    expect(() => scheduleOutboxFailure({ ...record, state: "delivered" }, new Date())).toThrow()
  })
  it("rejects invalid attempt count", () => {
    expect(() => scheduleOutboxFailure({ ...record, attempts: 5 }, new Date())).toThrow()
  })
})
