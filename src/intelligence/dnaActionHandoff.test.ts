import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { buildDnaActionContext, readDnaActionContext } from "./dnaActionHandoff"

const decision = readFileSync(new URL("../pages/DecisionIntelligence.tsx", import.meta.url), "utf8")
const drafts = readFileSync(new URL("../pages/DraftGenerator.tsx", import.meta.url), "utf8")
const hearing = readFileSync(new URL("../pages/JudgeSimulator.tsx", import.meta.url), "utf8")

const strategy = {
  strategy_summary: "Priorizar prova documental do nexo causal.",
  favorable_arguments: ["Documentos comprovam pagamentos"],
  adverse_arguments: ["A parte contrária sustenta ausência de vínculo"],
  evidence_matrix: [{ requirement: "Nexo causal", recommended_action: "Anexar laudo" }],
  next_actions: ["Ouvir testemunhas"],
}

describe("DNA do Juiz → redação e audiência", () => {
  it("builds an actionable case-bound handoff for the current account", () => {
    const value = buildDnaActionContext({ userId: "user-a", facts: "Fatos de uma ação de indenização", thesis: "Demonstrar nexo causal", strategy })
    expect(value?.focus).toContain("Anexar laudo")
    expect(value?.focus).toContain("Ouvir testemunhas")
    expect(value?.focus).toContain("Verificar cada decisão original")
    expect(readDnaActionContext({ dnaContext: value }, "user-a")?.caseText).toContain("indenização")
    expect(readDnaActionContext({ dnaContext: value }, "user-b")).toBeNull()
    expect(readDnaActionContext({ dnaContext: value }, undefined)).toBeNull()
  })
  it("refuses unverified or malformed navigation payloads", () => {
    expect(buildDnaActionContext({ userId: "x", facts: "fatos", thesis: "tese", strategy: null })).toBeNull()
    expect(readDnaActionContext({ dnaContext: { source: "other", userId: "x", caseText: "x", focus: "y", argument: "z" } }, "x")).toBeNull()
  })
  it("uses existing draft generator and hearing simulator, not parallel engines or persistent storage", () => {
    expect(decision).toContain('continueWithDna("draft")')
    expect(decision).toContain('continueWithDna("hearing")')
    expect(decision).toContain('state: { dnaContext }')
    expect(drafts).toContain("readDnaActionContext(location.state, user?.id)")
    expect(hearing).toContain("readDnaActionContext(location.state, user?.id)")
    expect(hearing).toContain("não uma reprodução do magistrado real")
    expect(decision).not.toContain('localStorage.setItem("nexjud_dna')
  })
})
