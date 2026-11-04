import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"

const hook = readFileSync(new URL("../hooks/usePlan.ts", import.meta.url), "utf8")
const gate = readFileSync(new URL("../components/SubscriptionGate.tsx", import.meta.url), "utf8")

describe("subscription lookup failure recovery", () => {
  it("tracks lookup errors instead of silently treating service failure as an expired plan", () => {
    expect(hook).toContain("const [subscriptionError, setSubscriptionError] = useState(false)")
    expect(hook).toContain("setSubscriptionError(true)")
    expect(hook).toContain("subscriptionError,")
  })
  it("keeps access blocked but offers retry without generating a new payment", () => {
    expect(gate).toContain("if (subscriptionError)")
    expect(gate).toContain("void refresh()")
    expect(gate).toContain("Isso não significa que seu plano expirou")
    expect(gate.indexOf("if (subscriptionError)")).toBeLessThan(gate.indexOf('if (!subscription) return <Navigate'))
    expect(gate).not.toContain("createPixCheckout")
  })
})
