import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
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
  it("enforces ownership in the rendering/permission path, not only asynchronous callbacks", () => {
    const hook = readFileSync(new URL("../hooks/usePlan.ts", import.meta.url), "utf8")
    expect(hook).toContain("const currentSubscription = subscriptionForUser(subscription, user?.id)")
    expect(hook).toContain("paidEntitlementCurrent(currentSubscription)")
    expect(hook).toContain("subscription: currentSubscription")
    expect(hook).not.toContain("paidEntitlementCurrent(subscription)")
  })
  it("does not expose subscriptions when signed out or loading", () => {
    expect(subscriptionForUser(active("user-a"), null)).toBeNull()
    expect(subscriptionForUser(active("user-a"), undefined)).toBeNull()
    expect(subscriptionForUser(null, "user-a")).toBeNull()
  })
})
