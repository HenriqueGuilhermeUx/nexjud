import { describe, expect, it } from "vitest"
import { buildJudgeStrategyAdvice } from "./judgeStrategyAdvice"
import type { DecisionEvidenceAudit } from "./decisionEvidenceAudit"
import type { JudicialDecisionEvidence } from "./judicialDecisionSchema"

const decision: JudicialDecisionEvidence = {
  id: "decision-1", source: "tribunal_publico", sourceDocumentId: "acordao-42",
  sourceUrl: "https://tribunal.example/decisao/42",
  processNumber: "1234567-89.2025.8.26.0001",
  court: "TJSP", judgingBody: "1ª Vara Cível", judgeOrRapporteur: "Juíza Maria Silva", decisionDate: "2025-10-09",
  caseClass: "Procedimento Comum", subjects: ["Responsabilidade civil"],
  reasoning: ["O autor deve demonstrar dano, nexo causal e conduta."],
  observedOutcome: "Pedido rejeitado por insuficiência de prova", legalTheses: ["Ônus da prova"],
  facts: [], claims: [], citedPrecedents: [], citedLegislation: [], collectedAt: "2026-11-04",
}
const base = (withEvidence: boolean): DecisionEvidenceAudit => ({
  recordsReceived: 1, distinctRecords: 1, duplicateRecords: 0,
  qualifiedDecisions: withEvidence ? 1 : 0,
  comparableDecisions: withEvidence ? 1 : 0,
  enoughForDescriptivePattern: false, period: "2025-10-09 a 2025-10-09",
  gaps: [], comparableEvidence: withEvidence ? [decision] : [],
  review: withEvidence ? [{
    id: decision.id, court: decision.court, judgingBody: decision.judgingBody!,
    processNumber: decision.processNumber!, source: decision.source,
    documentReference: decision.sourceDocumentId!, sourceUrl: decision.sourceUrl!,
    decisionDate: decision.decisionDate!, qualified: true, comparable: true,
    exclusionReasons: [],
  }] : [],

})

describe("judge DNA strategy adviser", () => {
  it("abstains from attributing a strategy to a judge without documented comparable decisions", () => {
    const result = buildJudgeStrategyAdvice(base(false), "Fatos do caso", "Tese")
    expect(result.coverage).toBe("insufficient")
    expect(result.scope).toBe("insufficient")
    expect(result.sourceCount).toBe(0)
    expect(result.actions.every(action => action.references.length === 0)).toBe(true)
    expect(result.headline).toContain("não há decisões")
  })
  it("never attributes a different magistrate's decision to the requested judge", () => {
    const result = buildJudgeStrategyAdvice(base(true), "Fatos", "Tese", "Juiz João Santos")
    expect(result.coverage).toBe("insufficient")
    expect(result.headline).toContain("magistrado informado")
    expect(result.actions.every(action => action.references.length === 0)).toBe(true)
  })
  it("accepts an exact magistrate match with normalized whitespace and case", () => {
    const result = buildJudgeStrategyAdvice(base(true), "Fatos", "Tese", "  JUÍZA   MARIA SILVA  ")
    expect(result.coverage).toBe("documented")
    expect(result.scope).toBe("named_magistrate")
    expect(result.sourceCount).toBe(1)
    expect(result.headline).toContain("amostra é reduzida")
  })
  it("returns specific recorded grounds, the actual outcome and traceable sources", () => {
    const result = buildJudgeStrategyAdvice(base(true), "Dano alegado", "Responsabilidade civil")
    expect(result.coverage).toBe("documented")
    expect(result.scope).toBe("judging_body")
    expect(result.headline).not.toContain("atribuídas ao magistrado")
    expect(result.actions[0].recommendation).toContain("dano, nexo causal e conduta")
    expect(result.actions[0].recommendation).toContain("insuficiência de prova")
    expect(result.actions[0].references[0].sourceUrl).toBe("https://tribunal.example/decisao/42")
    expect(result.actions[2].recommendation).toContain("reformulá-la")
    expect(result.disclaimer).toContain("não previsão")
  })
  it("does not label an unreasoned comparison as documented guidance", () => {
    const noGrounds = base(true)
    noGrounds.comparableEvidence = [{ ...decision, reasoning: [] }]
    const result = buildJudgeStrategyAdvice(noGrounds, "Fatos", "Tese", "Juíza Maria Silva")
    expect(result.coverage).toBe("insufficient")
    expect(result.scope).toBe("insufficient")
    expect(result.actions[0].references).toEqual([])
  })
  it("uses a grounded decision even when eight earlier records lack reasoning", () => {
    const audit = base(true)
    const unavailable = Array.from({ length: 8 }, (_, index) => ({
      ...decision, id: "missing-" + index, reasoning: [],
    }))
    audit.comparableEvidence = [...unavailable, { ...decision, id: "grounded-last" }]
    audit.review = audit.comparableEvidence.map(item => ({
      id: item.id, court: item.court, judgingBody: item.judgingBody!,
      processNumber: item.processNumber!, source: item.source,
      documentReference: item.sourceDocumentId!, sourceUrl: item.sourceUrl!,
      decisionDate: item.decisionDate!, qualified: true, comparable: true,
      exclusionReasons: [],
    }))
    const result = buildJudgeStrategyAdvice(audit, "Fatos", "Tese")
    expect(result.coverage).toBe("documented")
    expect(result.sourceCount).toBe(1)
    expect(result.actions[0].references.map(ref => ref.id)).toEqual(["grounded-last"])
  })
  it("excludes entries without a documented outcome", () => {
    const audit = base(true)
    audit.comparableEvidence = [{ ...decision, observedOutcome: "" }]
    const result = buildJudgeStrategyAdvice(audit, "Fatos", "Tese")
    expect(result.coverage).toBe("insufficient")
    expect(result.sourceCount).toBe(0)
  })

})
