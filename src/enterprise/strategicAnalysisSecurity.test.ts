import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"

const source = readFileSync(
  new URL("../../supabase/functions/strategic-analysis/index.ts", import.meta.url),
  "utf8"
)

describe("strategic analysis — authenticated and evidence-bound", () => {
  it("requires an authenticated user before calling the billable model", () => {
    const authIndex = source.indexOf("authClient.auth.getUser()")
    const modelIndex = source.indexOf('fetch("https://api.openai.com/v1/responses"')
    expect(authIndex).toBeGreaterThan(0)
    expect(modelIndex).toBeGreaterThan(authIndex)
    expect(source).toContain('status: 401')
    expect(source).toContain('status: 405')
  })

  it("checks the user's active trial or paid entitlement before model use", () => {
    const entitlement = source.indexOf('.from("subscriptions")')
    const model = source.indexOf('fetch("https://api.openai.com/v1/responses"')
    expect(entitlement).toBeGreaterThan(source.indexOf("authClient.auth.getUser()"))
    expect(model).toBeGreaterThan(entitlement)
    expect(source).toContain('status: 403')
    expect(source).toContain('status: 503')
    expect(source).toContain('subscription.status === "trialing"')
    expect(source).toContain('subscription.status === "active"')
  })

  it("refuses to return generative legal win-rate estimates", () => {
    expect(source).toContain("successProbability: null")
    expect(source).toContain("predictionValidated: false")
    expect(source).toContain("favorableRate: null")
    expect(source).toContain('settlementChance: "Não validada estatisticamente"')
    expect(source).not.toContain('"successProbability": 0')
    expect(source).not.toContain('"favorableRate": 0')
  })

  it("limits untrusted case text before external model calls", () => {
    expect(source).toContain("caseText.length > 30000")
  })
})
