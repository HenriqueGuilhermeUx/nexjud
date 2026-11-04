import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
const landing = readFileSync(new URL("../pages/Landing.tsx", import.meta.url), "utf8")
const pricing = readFileSync(new URL("../pages/PricingPage.tsx", import.meta.url), "utf8")
const pwa = readFileSync(new URL("../pages/CompanionPWA.tsx", import.meta.url), "utf8")
const mobile = readFileSync(new URL("../../mobile/App.tsx", import.meta.url), "utf8")
describe("judge DNA marketing and mobile parity", () => {
  it("makes DNA the primary public product, while preserving seven-day trial", () => {
    expect(landing).toContain("DNA do Juiz")
    expect(landing).toContain("IA Preditiva")
    expect(landing).toContain("7 dias de Trial Premium")
    expect(landing).toContain("R$ 197/mês")
  })
  it("uses the same DNA route in mobile and PWA", () => {
    for (const source of [mobile, pwa]) {
      expect(source).toContain("DNA do Juiz — IA Preditiva")
      expect(source).toContain('path: "/dashboard/decision-intelligence"')
      expect(source).not.toContain("Análise do Juízo completa")
    }
  })
  it("keeps billing amounts unchanged and does not promise unfinished enterprise integrations", () => {
    for (const amount of ["R$ 197/mês", "R$ 397/mês", "R$ 797/mês", "R$ 1.497/mês"]) expect(pricing).toContain(amount)
    expect(pricing).toContain("API e integrações (sob avaliação)")
    expect(pricing).toContain("DNA do Juiz — IA Preditiva")
  })
})
