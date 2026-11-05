import { describe, expect, it } from "vitest"
import { confirmDjenReview, hasTrustedCourtReference, hasDocumentSpecificCourtReference, isPrecedentEligibleForDna, DJEN_REVIEWED_TAG } from "./precedentReviewGate"
import { readFileSync } from "node:fs"

const original = "Publicação DJEN — conferir documento original: https://esaj.tjsp.jus.br/documento/123"
const reasoning = "O tribunal considerou insuficiente a prova do vínculo e explicou o ônus probatório na fundamentação."

describe("DJEN documented precedent admission for judge DNA", () => {
  it("keeps a DJEN publication out of DNA until reviewed and source linked", () => {
    const base = { id: "a", tags: ["DJEN", "revisão manual pendente"], resumo: original, fundamento: reasoning }
    expect(isPrecedentEligibleForDna(base)).toBe(false)
    expect(isPrecedentEligibleForDna({ ...base, tags: ["DJEN"] })).toBe(false)
    expect(isPrecedentEligibleForDna({ ...base, tags: ["DJEN", DJEN_REVIEWED_TAG], resumo: "Sem fonte" })).toBe(false)
    expect(isPrecedentEligibleForDna({ ...base, tags: ["DJEN", DJEN_REVIEWED_TAG], resumo: "https://esaj.tjsp.jus.br/" })).toBe(false)
    expect(isPrecedentEligibleForDna({ ...base, tags: ["DJEN", DJEN_REVIEWED_TAG], fundamento: "curto" })).toBe(false)
    expect(isPrecedentEligibleForDna({ ...base, tags: ["DJEN", DJEN_REVIEWED_TAG] })).toBe(true)
  })
  it("requires lawyer attestation and substantive reasoning when confirming a DJEN source", () => {
    const base = { sourceUrl: "https://esaj.tjsp.jus.br/documento/123", fundamento: reasoning, acknowledged: true, tags: "DJEN, revisão manual pendente" }
    expect(confirmDjenReview({ ...base, acknowledged: false }).ok).toBe(false)
    expect(confirmDjenReview({ ...base, fundamento: "Tese breve" }).ok).toBe(false)
    expect(confirmDjenReview({ ...base, sourceUrl: "https://example.com/doc" }).ok).toBe(false)
    expect(confirmDjenReview({ ...base, sourceUrl: "https://esaj.tjsp.jus.br/" }).ok).toBe(false)
    const done = confirmDjenReview(base)
    expect(done.ok).toBe(true)
    if (done.ok) {
      expect(done.tags).toContain(DJEN_REVIEWED_TAG)
      expect(done.tags).not.toContain("revisão manual pendente")
    }
  })
  it("never accepts external hosts masquerading as judicial links", () => {
    expect(hasTrustedCourtReference("https://tribunal.jus.br.attacker.example/doc")).toBe(false)
    expect(hasTrustedCourtReference("http://tjsp.jus.br/doc")).toBe(false)
    expect(hasTrustedCourtReference("https://esaj.tjsp.jus.br/documento/123")).toBe(true)
    expect(hasDocumentSpecificCourtReference("https://esaj.tjsp.jus.br/")).toBe(false)
    expect(hasDocumentSpecificCourtReference("https://esaj.tjsp.jus.br/documento/123")).toBe(true)
    expect(hasDocumentSpecificCourtReference("https://esaj.tjsp.jus.br.attacker.example/documento/123")).toBe(false)
  })
  it("preserves legacy verified library entries without DJEN labels", () => {
    expect(isPrecedentEligibleForDna({ id: "legacy", tags: ["STJ"], fundamento: "Texto resumido" })).toBe(true)
    expect(isPrecedentEligibleForDna({ id: "pending", tags: ["revisão manual pendente"], fundamento: reasoning })).toBe(false)
  })
  it("wires explicit review to the existing library and DNA without new backend storage", () => {
    const page = readFileSync(new URL("../pages/Precedents.tsx", import.meta.url), "utf8")
    const dna = readFileSync(new URL("../pages/DecisionIntelligence.tsx", import.meta.url), "utf8")
    expect(page).toContain("confirmDjenReview({")
    expect(page).toContain("checked={djenVerified}")
    expect(page).toContain("reviewedTags ?? tags")
    expect(dna).toContain("items.filter(isPrecedentEligibleForDna)")
  })
})
