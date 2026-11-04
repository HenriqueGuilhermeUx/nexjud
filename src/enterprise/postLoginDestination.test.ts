import { describe, expect, it } from "vitest"
import { postLoginDestination } from "../services/postLoginDestination"

describe("authenticated checkout return path", () => {
  it("returns existing users to pricing without initiating payment", () => {
    expect(postLoginDestination("/pricing", true)).toBe("/pricing")
  })

  it("retains the existing onboarding journey for first-time users", () => {
    expect(postLoginDestination("/pricing", false)).toBe("/welcome?next=%2Fpricing")
    expect(postLoginDestination(null, false)).toBe("/welcome")
  })

  it("rejects external or unrecognized destinations", () => {
    expect(postLoginDestination("https://evil.example", true)).toBe("/dashboard")
    expect(postLoginDestination("//evil.example", true)).toBe("/dashboard")
    expect(postLoginDestination("//evil.example", false)).toBe("/welcome")
    expect(postLoginDestination("/dashboard/admin", true)).toBe("/dashboard")
    expect(postLoginDestination(null, true)).toBe("/dashboard")
  })
})
