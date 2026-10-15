import { describe, expect, it } from "vitest"
import { DecisionSearchGuard } from "../intelligence/decisionSearchGuard"

describe("Decision Intelligence — asynchronous query isolation", () => {
  it("does not allow a superseded process to overwrite current evidence", () => {
    const gate = new DecisionSearchGuard()
    const olderProcess = gate.begin()
    const newerProcess = gate.begin()
    expect(gate.isCurrent(olderProcess)).toBe(false)
    expect(gate.isCurrent(newerProcess)).toBe(true)
  })

  it("invalidates an in-flight request when the user edits the case", async () => {
    const gate = new DecisionSearchGuard()
    const generation = gate.begin()
    const delayedResponse = Promise.resolve({ number: "older-cnJ" })
    gate.invalidate()
    await delayedResponse
    expect(gate.isCurrent(generation)).toBe(false)
  })

  it("ignores late responses after navigation/unmount or a failed search", () => {
    const gate = new DecisionSearchGuard()
    const request = gate.begin()
    gate.invalidate()
    expect(gate.isCurrent(request)).toBe(false)
    const next = gate.begin()
    expect(gate.isCurrent(next)).toBe(true)
    expect(gate.isCurrent(0)).toBe(false)
  })
})
