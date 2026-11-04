import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"

const page = readFileSync(new URL("../pages/DecisionIntelligence.tsx", import.meta.url), "utf8")

describe("DNA source-consistent strategy actions", () => {
  it("pins generated strategy to exact selected precedent IDs", () => {
    expect(page).toContain("const selectedIdsAtRequest = [...selectedPrecedents]")
    expect(page).toContain("precedentIds: selectedIdsAtRequest")
    expect(page).toContain("setStrategySourceIds(result?.result ? selectedIdsAtRequest : [])")
  })
  it("invalidates an answer and its pending request when sources change", () => {
    expect(page).toContain("A seleção de precedentes mudou. Execute novamente a análise")
    expect(page).toContain("searchGuard.current.invalidate()")
    expect(page).toContain("setStrategyResult(null)")
    expect(page).toContain("setStrategySourceIds([])")
  })
  it("blocks outdated handoff to draft and hearing modules", () => {
    expect(page).toContain("selectedPrecedents.length !== strategySourceIds.length")
    expect(page).toContain("selectedPrecedents.some(id => !strategySourceIds.includes(id))")
    expect(page).toContain("As fontes selecionadas mudaram.")
  })
  it("identifies library sources as unverified rather than verified court documents", () => {
    expect(page).toContain("Referências selecionadas para esta análise")
    expect(page).toContain("não verificou automaticamente sua autenticidade")
    expect(page).toContain("nem confirmou que pertencem ao magistrado informado")
  })
})
