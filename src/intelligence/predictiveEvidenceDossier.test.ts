import { describe, expect, it } from "vitest"
import { assessPredictiveReadiness, buildPredictiveEvidenceDossier } from "../intelligence/predictiveEvidenceDossier"
import type { DecisionEvidenceAudit } from "../intelligence/decisionEvidenceAudit"

const audit = (overrides: Partial<DecisionEvidenceAudit> = {}): DecisionEvidenceAudit => ({
  recordsReceived: 3,
  distinctRecords: 2,
  duplicateRecords: 1,
  qualifiedDecisions: 0,
  comparableDecisions: 0,
  enoughForDescriptivePattern: false,
  period: null,
  gaps: [{ label: "Fundamentação não disponível", count: 2, guidance: "Obter inteiro teor." }],
  review: [{
    id: "registro-1",
    court: "TJSP",
    judgingBody: null,
    processNumber: "1234567-89.2026.8.26.0001",
    source: "datajud",
    documentReference: null,
    sourceUrl: null,
    decisionDate: null,
    qualified: false,
    comparable: false,
    exclusionReasons: ["Documento decisório não identificado"],
  }],
  comparableEvidence: [],
  ...overrides,
})

describe("predictive decision evidence dossier", () => {
  it("abstains when DataJud contains only process metadata", () => {
    const result = assessPredictiveReadiness(audit())
    expect(result.status).toBe("sem_base")
    expect(result.explanation).toContain("Nenhuma probabilidade")
  })
  it("does not promote decisions from other venues to comparable outcomes", () => {
    const result = assessPredictiveReadiness(audit({ qualifiedDecisions: 2, comparableDecisions: 0 }))
    expect(result.status).toBe("base_documentada")
  })
  it("treats three comparable decisions as exploratory, not statistically calibrated", () => {
    const result = assessPredictiveReadiness(audit({
      qualifiedDecisions: 3, comparableDecisions: 3, enoughForDescriptivePattern: true,
    }))
    expect(result.status).toBe("padrao_exploratorio")
    expect(result.explanation).toContain("não autoriza estimar chance de êxito")
  })
  it("exports exclusions, provenance and limitations instead of invented percentages", () => {
    const result = buildPredictiveEvidenceDossier({
      processNumber: "1234567-89.2026.8.26.0001",
      court: "TJSP", judgingBody: "1ª Vara", generatedAt: "2026-11-04T15:00:00Z",
      audit: audit(),
    })
    expect(result).toContain("Registros distintos: 2")
    expect(result).toContain("Duplicatas excluídas: 1")
    expect(result).toContain("Origem: datajud")
    expect(result).toContain("Documento decisório não identificado")
    expect(result).toContain("Não foram calculadas probabilidade de êxito")
    expect(result).not.toMatch(/chance de êxito:\s*\d+%/i)
  })
})
