import { describe, expect, it } from "vitest"
import { prepareLawyerProvidedDecision } from "../intelligence/lawyerProvidedDecision"

const base = { documentReference: "TJSP-doc-2026", sourceUrl: "https://esaj.tjsp.jus.br/decisao", reasoningExcerpt: "Fundamentação literal copiada do documento original." }
describe("Manual documentary review — user-supplied and not verified", () => {
  it("accepts readable source excerpts but marks them unverified", () => {
    const result = prepareLawyerProvidedDecision(base)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.document.sourceStatus).toBe("fornecido_pelo_usuario_nao_verificado")
      expect(result.document.reasoningExcerpt).toBe(base.reasoningExcerpt)
      expect(result.document.sourceUrl).toBe("https://esaj.tjsp.jus.br/decisao")
    }
  })
  it("rejects an unsupported or credentials-bearing link", () => {
    expect(prepareLawyerProvidedDecision({ ...base, sourceUrl: "javascript:alert(1)" }).ok).toBe(false)
    expect(prepareLawyerProvidedDecision({ ...base, sourceUrl: "https://user:secret@court.example/a" }).ok).toBe(false)
  })
  it("rejects local-network and internal browser links", () => {
    for (const url of ["http://127.0.0.1/internal", "http://localhost", "http://192.168.1.10", "http://10.0.1.5", "http://[::1]/"]) {
      expect(prepareLawyerProvidedDecision({ ...base, sourceUrl: url }).ok).toBe(false)
    }
  })
  it("requires meaningful copied reasoning, not process metadata", () => {
    expect(prepareLawyerProvidedDecision({ ...base, reasoningExcerpt: "Sentença" }).ok).toBe(false)
    expect(prepareLawyerProvidedDecision({ ...base, reasoningExcerpt: "a".repeat(12001) }).ok).toBe(false)
  })
  it("requires at least one original reference", () => {
    expect(prepareLawyerProvidedDecision({ ...base, sourceUrl: "", documentReference: "" }).ok).toBe(false)
    expect(prepareLawyerProvidedDecision({ ...base, sourceUrl: "", documentReference: "doc-123" }).ok).toBe(true)
  })
})
