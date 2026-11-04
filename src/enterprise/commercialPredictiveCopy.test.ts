import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8")

describe("Brazil commercial readiness — protect users from unvalidated win rates", () => {
  const ui = [
    "pages/HomeDashboard.tsx",
    "pages/History.tsx",
    "components/dashboard/DashboardMetrics.tsx",
    "services/pdfReport.ts",
  ]

  it.each(ui)("%s must not present generative win-rate fields as quantified predictions", (file) => {
    const code = source(file)
    // These are the specific earlier displays, not a blanket ban on statistical research.
    expect(code).not.toMatch(/\${(?:analysis|item|analysisResult)\.success_probability\s*\|\|\s*0\}%/)
    expect(code).not.toMatch(/\${(?:item\.)?jurisprudence(?:_prediction|Prediction)\??\.favorableRate\s*\|\|\s*0\}%/)
    expect(code).not.toContain("chance estratégica estimada")
    expect(code).not.toContain("Chance de Êxito")
    expect(code).not.toContain('title="Jurisprudência Preditiva™"')
    expect(code).not.toContain("Jurisprudência Preditiva Real™")
  })

  it("does not advertise DataJud movements as calibrated predictions", () => {
    const dashboard = source("pages/HomeDashboard.tsx")
    expect(dashboard).not.toContain("Jurisprudência Preditiva Real™")
    expect(dashboard).not.toContain("Jurisprudência Preditiva™")
    expect(dashboard).not.toContain("Chance de acordo: ")
    expect(dashboard).toContain("Sinais processuais observados — DataJud")
  })

  it("keeps the predictive product labeled as unvalidated on every affected view", () => {
    for (const file of ui) {
      expect(source(file)).toContain("Não validada")
    }
  })

  it("does not print a contradictory legacy subscription price on the landing", () => {
    const landing = source("pages/Landing.tsx")
    expect(landing).not.toContain('price="R$ 179,90/mês"')
    expect(landing).toContain('to="/pricing"')
    expect(landing).toContain("Profissional e escritório pequeno")
    expect(landing).toContain("Departamento jurídico e Enterprise")
  })
})
