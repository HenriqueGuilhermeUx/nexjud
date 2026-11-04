import { describe, expect, it } from "vitest"
import { subscriptionForUser } from "../services/subscriptionForUser"
import type { Subscription } from "../services/subscriptionService"

const active = (user_id: string): Subscription => ({
  user_id, plan: "enterprise", status: "active", active: true,
})

describe("subscription ownership binding", () => {
  it("permits a subscription belonging to the authenticated customer", () => {
    expect(subscriptionForUser(active("user-a"), "user-a")?.plan).toBe("enterprise")
  })
  it("never leaks previous account permissions on account switch", () => {
    expect(subscriptionForUser(active("user-a"), "user-b")).toBeNull()
  })
  it("does not expose subscriptions when signed out or loading", () => {
    expect(subscriptionForUser(active("user-a"), null)).toBeNull()
    expect(subscriptionForUser(active("user-a"), undefined)).toBeNull()
    expect(subscriptionForUser(null, "user-a")).toBeNull()
  })
})
