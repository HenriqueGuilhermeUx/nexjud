import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"

const source = readFileSync(new URL("../pages/DecisionIntelligence.tsx", import.meta.url), "utf8")
const analyze = source.slice(source.indexOf("  async function analyze() {"), source.indexOf("  const p = evidence?.prediction"))

describe("NexJud process lookup partial availability", () => {
  it("publishes the located process before optional similar-case requests", () => {
    const lookup = analyze.indexOf("await searchProcessDatajud(")
    const publish = analyze.indexOf("setProcess(found.process)")
    const supplementary = analyze.indexOf("await searchSimilarCasesDatajud(")
    expect(lookup).toBeGreaterThanOrEqual(0)
    expect(publish).toBeGreaterThan(lookup)
    expect(supplementary).toBeGreaterThan(publish)
  })
  it("does not hide the process when the similar-case service fails", () => {
    expect(analyze).toContain('setEvidence({ prediction: null, cases: [], normalized: [], argument: providedArgument })')
    expect(analyze).toContain("Processo localizado no DataJud. A busca complementar")
    expect(analyze).toContain("if (!searchGuard.current.isCurrent(requestVersion)) return")
  })
  it("does not auto-save searches or present DataJud movements as documented rulings", () => {
    expect(analyze).toContain("historyUserIdForSearch(saveToHistory, user?.id)")
    expect(analyze).toContain("const reviewed = auditDecisionEvidence(normalized")
    expect(analyze).toContain("reviewed.enoughForDescriptivePattern")
  })
})
