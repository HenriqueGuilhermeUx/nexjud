import { describe, expect, it } from "vitest"
import { transitionCase } from "./caseWorkflow"

const base = { role: "reviewer" as const, evidenceVerified: true, reviewerIsAuthor: false, justification: "Conferido por profissional habilitado." }

describe("Enterprise case workflow", () => {
  it("permits intake triage", () => {
    expect(transitionCase("intake", "start_triage", { ...base, role: "legal" })).toEqual({ ok: true, nextStatus: "triage" })
  })
  it("rejects impossible transitions", () => {
    expect(transitionCase("intake", "approve", base).ok).toBe(false)
  })
  it("rejects readers", () => {
    expect(transitionCase("intake", "start_triage", { ...base, role: "reader" }).ok).toBe(false)
  })
  it("rejects self approval", () => {
    expect(transitionCase("ready_for_review", "approve", { ...base, reviewerIsAuthor: true }).ok).toBe(false)
  })
  it("rejects unverified evidence", () => {
    expect(transitionCase("ready_for_review", "approve", { ...base, evidenceVerified: false }).ok).toBe(false)
  })
  it("requires a reason for approval", () => {
    expect(transitionCase("ready_for_review", "approve", { ...base, justification: " " }).ok).toBe(false)
  })
  it("permits independent reviewer approval", () => {
    expect(transitionCase("ready_for_review", "approve", base)).toEqual({ ok: true, nextStatus: "approved" })
  })
  it("does not let reviewers close cases", () => {
    expect(transitionCase("approved", "close", base).ok).toBe(false)
  })
})
