import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { buildDossierDraftContext } from "./dnaActionHandoff"

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")

describe("tese sugerida e peça a partir do dossiê", () => {
  it("a função pede três teses conforme o lado do cliente, sem percentuais, e guarda o contexto por 24 h", () => {
    const fn = read("../../supabase/functions/decision-intelligence/index.ts")
    expect(fn).toContain("suggestedTheses")
    expect(fn).toContain('body.side === "autor" || body.side === "reu"')
    expect(fn).toContain("dna_context_cache")
    expect(fn).toMatch(/Nunca dê percentuais/)
    expect(fn).not.toMatch(/successProbability|probability:/)
  })

  it("web, PWA e app perguntam o lado e mostram as teses", () => {
    expect(read("../components/JudgeDossierPanel.tsx")).toContain("Teses sugeridas para este caso")
    expect(read("../pages/CompanionPWA.tsx")).toContain("<ThesesPWA")
    const mobile = read("../../mobile/App.tsx")
    expect(mobile).toContain("Teses sugeridas para este caso")
    expect(mobile).toContain("side: side || undefined")
  })

  it("leva tese, fatos e decisões reais do juízo (com link) para o gerador de peças", () => {
    const ctx = buildDossierDraftContext({
      userId: "u1",
      thesis: "Dano moral in re ipsa pela negativação indevida.",
      result: {
        process: { number: "1000123-45.2024.8.26.0100", court: "TJSP", courtUnit: "2ª Vara Cível", className: "Procedimento Comum Cível", subject: "Indenização" },
        summary: "Resumo do caso.",
        recurringGrounds: ["Súmula 385 do STJ"],
        dossier: { judgingBody: "2ª Vara Cível", items: [{ kindLabel: "Sentença", outcomeLabel: "Procedente", date: "2026-11-20", processNumber: "1000999-11.2025.8.26.0100", excerpt: "Julgo procedente…", link: "https://esaj.tjsp.jus.br/x" }] },
      },
    })
    expect(ctx?.argument).toContain("Dano moral")
    expect(ctx?.caseText).toContain("2ª Vara Cível")
    expect(ctx?.focus).toContain("https://esaj.tjsp.jus.br/x")
    expect(ctx?.focus).toContain("Não invente jurisprudência")
    expect(buildDossierDraftContext({ userId: "u1", thesis: "", result: {} })).toBeNull()
    expect(buildDossierDraftContext({ userId: undefined, thesis: "x", result: {} })).toBeNull()
  })
})
