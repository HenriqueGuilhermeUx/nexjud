import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { normalizeDjenPublicPage } from "../../netlify/lib/djenPublic.mjs"
import { makeDjenReviewHandoff, readDjenReviewHandoff } from "./djenReviewHandoff"

const processNumber = "00012345620268260001"
const baseRecord = {
  id: "publication-1", numeroProcesso: processNumber,
  siglaTribunal: "TJSP", nomeOrgao: "1ª Vara Cível",
  tipoDocumento: "Sentença", tipoComunicacao: "Intimação",
  link: "https://esaj.tjsp.jus.br/publicacao/1",
  texto: "Exemplo privado — não deve chegar ao cliente",
}

describe("DJEN source review handoff", () => {
  it("filters unrelated and duplicate records BEFORE limiting to five", () => {
    const records = Array.from({ length: 7 }, (_, i) => ({
      ...baseRecord, id: "unrelated-" + i, numeroProcesso: "99999999999999999999",
    }))
    records.push(baseRecord)
    records.push({ ...baseRecord, id: "publication-2" })
    const page = normalizeDjenPublicPage({ items: records, count: records.length }, processNumber)
    expect(page.items).toHaveLength(2)
    expect(page.items.map(item => item.id)).toEqual(["publication-1", "publication-2"])
    expect(JSON.stringify(page)).not.toContain("Exemplo privado")
  })
  it("requires a candidate and a trusted official URL for prefilled manual review", () => {
    const data = normalizeDjenPublicPage({ items: [baseRecord] }, processNumber).items[0]
    const handoff = makeDjenReviewHandoff(data, "user-1")
    expect(handoff?.source).toBe("djen-publication-review")
    expect(handoff?.processNumber).toBe(processNumber)
    expect(handoff?.sourceUrl).toBe(baseRecord.link)
    expect(makeDjenReviewHandoff({ ...data, candidateForManualReview: false }, "user-1")).toBeNull()
    expect(makeDjenReviewHandoff({ ...data, sourceUrl: "https://notcourt.example/document" }, "user-1")).toBeNull()
  })
  it("does not reuse metadata under a different authenticated account", () => {
    const data = normalizeDjenPublicPage({ items: [baseRecord] }, processNumber).items[0]
    const handoff = makeDjenReviewHandoff(data, "user-1")
    expect(readDjenReviewHandoff({ djenReview: handoff }, "user-1")).not.toBeNull()
    expect(readDjenReviewHandoff({ djenReview: handoff }, "user-2")).toBeNull()
    expect(readDjenReviewHandoff({ djenReview: handoff }, undefined)).toBeNull()
  })
  it("keeps judicial reasoning blank and requires explicit save in existing library", () => {
    const page = readFileSync(new URL("../pages/Precedents.tsx", import.meta.url), "utf8")
    const dna = readFileSync(new URL("../pages/DecisionIntelligence.tsx", import.meta.url), "utf8")
    expect(page).toContain("setFundamento(\"\")")
    expect(page).toContain("readDjenReviewHandoff(location.state, user?.id)")
    expect(page).toContain("Confira o inteiro teor no tribunal")
    expect(page).toContain("await createPrecedent({")
    expect(dna).toContain("Revisar esta publicação na Biblioteca de Precedentes")
    expect(dna).toContain('includes("revisão manual pendente")')
    expect(page).toContain('"djenReview" in location.state')
    expect(dna).not.toContain("await createPrecedent(")
  })
})
