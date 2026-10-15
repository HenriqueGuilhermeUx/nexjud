import { describe, expect, it } from "vitest"
import { auditDecisionEvidence } from "../intelligence/decisionEvidenceAudit"
import { buildObservedDecisionPattern } from "../intelligence/decisionPattern"
import type { JudicialDecisionEvidence } from "../intelligence/judicialDecisionSchema"

const target = { court: "TJSP", judgingBody: "4ª Vara Cível" }
function decision(id: string, override: Partial<JudicialDecisionEvidence> = {}): JudicialDecisionEvidence {
  return {
    id, source: "tribunal_publico",
    processNumber: "0000000-00.2026.8.26.0000", court: "TJSP",
    judgingBody: "4ª Vara Cível", decisionDate: "2026-10-01",
    caseClass: "Procedimento Comum", subjects: ["Direito civil"],
    facts: [], claims: [], legalTheses: ["Tema judicial"],
    reasoning: ["Fundamentação documental verificável."],
    citedPrecedents: ["Tema 10"], citedLegislation: [],
    observedOutcome: "acolhido", sourceDocumentId: "doc-" + id,
    collectedAt: "2026-10-15T12:00:00Z",
    ...override,
  }
}
describe("NexJud decision evidence audit — no fabricated judge prediction", () => {
  it("treats public metadata without reasoning and outcome as context, not a decision pattern", () => {
    const audit = auditDecisionEvidence([
      decision("x", { reasoning: [], observedOutcome: undefined }),
    ], target)
    expect(audit.recordsReceived).toBe(1)
    expect(audit.qualifiedDecisions).toBe(0)
    expect(audit.comparableDecisions).toBe(0)
    expect(audit.enoughForDescriptivePattern).toBe(false)
    expect(audit.gaps.find(g => g.label.includes("Fundamentação"))?.count).toBe(1)
    expect(audit.gaps.find(g => g.label.includes("Resultado"))?.count).toBe(1)
  })
  it("excludes duplicates, other courts and other judging bodies from one venue", () => {
    const items = [
      decision("1"), decision("2", { decisionDate: "2026-10-11" }),
      decision("3", { decisionDate: "2026-10-15" }),
      decision("duplicate", { sourceDocumentId: "doc-1" }),
      decision("otherCourt", { court: "TRF3", citedPrecedents: ["Tema externo"] }),
      decision("otherBody", { judgingBody: "2ª Vara Cível", citedPrecedents: ["Tema externo"] }),
    ]
    const audit = auditDecisionEvidence(items, target)
    expect(audit.recordsReceived).toBe(6)
    expect(audit.distinctRecords).toBe(5)
    expect(audit.duplicateRecords).toBe(1)
    expect(audit.qualifiedDecisions).toBe(5)
    expect(audit.comparableDecisions).toBe(3)
    expect(audit.enoughForDescriptivePattern).toBe(true)
    expect(audit.period).toBe("2026-10-01 a 2026-10-15")
    const pattern = buildObservedDecisionPattern(audit.comparableEvidence)
    expect(pattern?.decisionsAnalyzed).toBe(3)
    expect(pattern?.recurringPrecedents).toEqual([{ label: "Tema 10", count: 3 }])
    expect(pattern?.evidenceIds).toEqual(["1", "2", "3"])
  })
  it("does not infer one venue when the court or judging body is missing", () => {
    const docs = [decision("1"), decision("2"), decision("3")]
    expect(auditDecisionEvidence(docs, { court: "TJSP" }).comparableDecisions).toBe(0)
    expect(auditDecisionEvidence(docs, { judgingBody: "4ª Vara Cível" }).comparableDecisions).toBe(0)
    expect(auditDecisionEvidence(docs, { court: "tjsp", judgingBody: "4ª vara cível" }).comparableDecisions).toBe(3)
  })
  it("rejects impossible dates and never counts a single decision as a pattern", () => {
    const impossible = auditDecisionEvidence([decision("1", { decisionDate: "2026-02-30" })], target)
    expect(impossible.qualifiedDecisions).toBe(0)
    expect(impossible.gaps.some(g => g.label.includes("Data"))).toBe(true)
    const one = auditDecisionEvidence([decision("2")], target)
    expect(one.qualifiedDecisions).toBe(1)
    expect(one.enoughForDescriptivePattern).toBe(false)
  })
  it("uses normalized venue and local decision dates consistently across audit and pattern", () => {
    const docs = [
      decision("1", { decisionDate: "2026-10-01T23:30:00-03:00" }),
      decision("2", { court: "tjsp", judgingBody: "4ª  VARA CÍVEL", decisionDate: "2026-10-05T23:00:00-03:00" }),
      decision("3", { court: "ＴＪＳＰ", decisionDate: "2026-10-10" }),
    ]
    const audit = auditDecisionEvidence(docs, target)
    expect(audit.comparableDecisions).toBe(3)
    expect(audit.period).toBe("2026-10-01 a 2026-10-10")
    const pattern = buildObservedDecisionPattern(audit.comparableEvidence)
    expect(pattern?.decisionsAnalyzed).toBe(3)
    expect(pattern?.period).toBe(audit.period)
    expect(pattern?.recurringPrecedents).toEqual([{ label: "Tema 10", count: 3 }])
  })
  it("never produces a single-venue pattern when court or judging body is missing", () => {
    expect(buildObservedDecisionPattern([decision("1", { judgingBody: undefined })])).toBeNull()
    expect(buildObservedDecisionPattern([decision("2", { court: "" })])).toBeNull()
  })
  it("never mixes precedents from another judging body even if called directly", () => {
    const pattern = buildObservedDecisionPattern([
      decision("1"), decision("2"), decision("3"),
      decision("other", { judgingBody: "Turma distinta", citedPrecedents: ["Tese alheia"] }),
    ])
    expect(pattern?.recurringPrecedents).toEqual([{ label: "Tema 10", count: 3 }])
    expect(pattern?.decisionsAnalyzed).toBe(3)
  })
  it("requires an identifiable judicial document, not just a process number or DataJud metadata", () => {
    const processOnly = decision("only-process", { sourceDocumentId: undefined })
    const datajud = decision("datajud-raw", { source: "datajud" })
    const checked = auditDecisionEvidence([processOnly, datajud, decision("verified")], target)
    expect(checked.qualifiedDecisions).toBe(1)
    expect(checked.comparableDecisions).toBe(1)
    expect(checked.enoughForDescriptivePattern).toBe(false)
    expect(checked.gaps.find(g => g.label.includes("Documento decisório"))?.count).toBe(2)
    expect(buildObservedDecisionPattern([processOnly, datajud, decision("verified")])).toBeNull()
  })
  it("direct pattern calls cannot bypass minimum sample, duplicate, or invalid-date gates", () => {
    expect(buildObservedDecisionPattern([decision("one")])).toBeNull()
    expect(buildObservedDecisionPattern([decision("one"), decision("two")])).toBeNull()
    expect(buildObservedDecisionPattern([
      decision("one"), decision("copy", { sourceDocumentId: "doc-one" }), decision("three"),
    ])).toBeNull()
    expect(buildObservedDecisionPattern([
      decision("one"), decision("two"), decision("invalid", { decisionDate: "2026-02-30" }),
    ])).toBeNull()
    expect(buildObservedDecisionPattern([decision("one"), decision("two"), decision("three")])?.decisionsAnalyzed).toBe(3)
  })
})
