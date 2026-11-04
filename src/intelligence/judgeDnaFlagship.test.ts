import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"

const decision = readFileSync(new URL("../pages/DecisionIntelligence.tsx", import.meta.url), "utf8")
const dashboard = readFileSync(new URL("../pages/Dashboard.tsx", import.meta.url), "utf8")
const home = readFileSync(new URL("../pages/HomeDashboard.tsx", import.meta.url), "utf8")

describe("DNA do Juiz flagship user journey", () => {
  it("uses exactly the flagship name in the first-class experience", () => {
    expect(decision).toContain("DNA do Juiz — IA Preditiva")
    expect(dashboard).toContain('label="DNA do Juiz — IA Preditiva"')
    expect(home).toContain('label: "DNA do Juiz — IA Preditiva"')
  })
  it("provides real precedent strategy without requiring a CNJ number", () => {
    expect(decision).toContain('aria-label="Análise estratégica com IA"')
    expect(decision.indexOf('aria-label="Análise estratégica com IA"')).toBeLessThan(decision.indexOf("{!evidence ?"))
    expect(decision).toContain('runPrecedentIntelligenceAi({')
    expect(decision).toContain('navigate("/dashboard/precedents")')
    expect(decision).toContain('selectedPrecedents.length === 0')
  })
  it("keeps named-judge attribution source-gated, no fabricated predictive percentages", () => {
    expect(decision).toContain("buildJudgeStrategyAdvice(audit, caseText, lawyerArgument, judgeName)")
    expect(decision).not.toContain("DNA_JUIZ_DATA")
    expect(decision).not.toContain("getMockData")
  })
  it("does not display an earlier account's asynchronous strategy results", () => {
    expect(decision).toContain("currentAuthUserId.current !== currentUserId")
    expect(decision).toContain("currentAuthUserId.current !== user.id")
    expect(decision).toContain("setSelectedPrecedents([])")
  })
})
