import { describe, expect, it } from "vitest"
import { buildDecisionReviewWorksheet } from "../intelligence/decisionReviewWorksheet"
import type { JudicialDecisionEvidence } from "../intelligence/judicialDecisionSchema"

const target = { court: "TJSP", judgingBody: "4ª Vara Cível" }
function item(id: string, override: Partial<JudicialDecisionEvidence> = {}): JudicialDecisionEvidence {
  return {
    id, source: "tribunal_publico", processNumber: "0000000-00.2026.8.26.0000",
    court: "TJSP", judgingBody: "4ª Vara Cível", decisionDate: "2026-10-10",
    caseClass: "Procedimento Comum", subjects: ["Direito civil"], facts: [], claims: [],
    legalTheses: ["Tese documentada"], reasoning: ["Fundamento verificável."],
    citedPrecedents: [], citedLegislation: [], observedOutcome: "indeferido",
    sourceDocumentId: "doc-" + id, collectedAt: "2026-10-15T12:00:00Z",
    ...override,
  }
}

describe("Decision Intelligence — human documentary comparison worksheet", () => {
  it("allows one documented decision for manual review without creating a 3-decision pattern", () => {
    const worksheet = buildDecisionReviewWorksheet([item("one")], target)
    expect(worksheet).toHaveLength(1)
    expect(worksheet[0].evidenceId).toBe("one")
    expect(worksheet[0].reasoningExcerpts).toEqual(["Fundamento verificável."])
    expect(worksheet[0].observedOutcome).toBe("indeferido")
  })

  it("never displays DataJud metadata, missing source, or another judging body as comparable reasoning", () => {
    const worksheet = buildDecisionReviewWorksheet([
      item("metadata", { source: "datajud" }),
      item("no-doc", { sourceDocumentId: undefined }),
      item("other", { judgingBody: "2ª Vara Cível" }),
      item("missing-reason", { reasoning: [] }),
      item("valid"),
    ], target)
    expect(worksheet.map((record) => record.evidenceId)).toEqual(["valid"])
  })

  it("deduplicates a document and preserves exact source text, not inferred opinions", () => {
    const decisions = [
      item("original", { sourceDocumentId: "decision-123",
        sourceUrl: "https://tribunal.example/decisao/123",
        reasoning: ["  O laudo não foi juntado. ", " A audiência ocorreu. ", " Decisão fundamentada. ", " Quarto fundamento."] }),
      item("duplicate", { sourceDocumentId: "decision-123" }),
    ]
    const worksheet = buildDecisionReviewWorksheet(decisions, target)
    expect(worksheet).toHaveLength(1)
    expect(worksheet[0].reasoningExcerpts).toEqual([
      "O laudo não foi juntado.", "A audiência ocorreu.", "Decisão fundamentada.",
    ])
    expect(worksheet[0].remainingReasoningSegments).toBe(1)
    expect(worksheet[0].sourceUrl).toBe("https://tribunal.example/decisao/123")
  })

  it("does not render links with unsafe protocols or embedded credentials", () => {
    const worksheet = buildDecisionReviewWorksheet([
      item("js-url", { sourceUrl: "javascript:alert(1)" }),
      item("embedded-credentials", { sourceUrl: "https://u:pass@court.example/decision" }),
    ], target)
    expect(worksheet).toHaveLength(2)
    expect(worksheet.every((record) => record.sourceUrl === null)).toBe(true)
  })

  it("does not return source reasoning if either target court or body is missing", () => {
    expect(buildDecisionReviewWorksheet([item("a")], { court: "TJSP" })).toEqual([])
    expect(buildDecisionReviewWorksheet([item("a")], { judgingBody: "4ª Vara Cível" })).toEqual([])
  })
})
