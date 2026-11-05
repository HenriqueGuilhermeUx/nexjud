import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { normalizeDjenPublicPage } from "../../netlify/lib/djenPublic.mjs"

const process = "12345678920268260001"
const courtRecord = {
  id: "public-id-1", numeroProcesso: process,
  siglaTribunal: "TJSP", nomeOrgao: "Vara Cível",
  tipoDocumento: "Sentença", tipoComunicacao: "Intimação",
  dataDisponibilizacao: "2026-11-03",
  link: "https://esaj.tjsp.jus.br/decisao/1",
  texto: "CPF 123.456.789-00 Segredo pessoal", nomeDestinatario: "Pessoa Teste",
  destinatarios: [{ nome: "Pessoa Teste" }], advogados: [{ nome: "Advogado Teste" }],
}

describe("DJEN point lookup: private-data-safe metadata", () => {
  it("returns only bounded, source-labelled records of exactly the requested process", () => {
    const page = normalizeDjenPublicPage({ count: 9, items: [
      courtRecord,
      { ...courtRecord, id: "other", numeroProcesso: "99999999999999999999" },
      { ...courtRecord, id: "public-id-1" },
    ] }, process)
    expect(page.items).toHaveLength(1)
    expect(page.items[0].candidateForManualReview).toBe(true)
    expect(page.items[0].confirmedDecision).toBe(false)
    expect(page.items[0].identifiedJudge).toBe(false)
    expect(page.items[0].sourceUrl).toContain("tjsp.jus.br")
    expect(page.truncated).toBe(true)
    expect(JSON.stringify(page)).not.toContain("123.456.789-00")
    expect(JSON.stringify(page)).not.toContain("Pessoa Teste")
    expect(JSON.stringify(page)).not.toContain("Advogado Teste")
    expect(JSON.stringify(page)).not.toContain("Segredo pessoal")
  })
  it("will not show untrusted external or HTTP source links", () => {
    const result = normalizeDjenPublicPage({ items: [
      { ...courtRecord, id: "a", link: "https://external.example/doc" },
      { ...courtRecord, id: "b", link: "http://esaj.tjsp.jus.br/doc" },
      { ...courtRecord, id: "c", link: "javascript:alert(1)" },
    ] }, process)
    expect(result.items.every(item => item.sourceUrl === null)).toBe(true)
  })
  it("rejects malformed upstream responses instead of treating errors as no publications", () => {
    expect(() => normalizeDjenPublicPage({ data: [] }, process)).toThrow("invalid_djen_response")
  })
  it("requires authentication, confines queries to one process and never stores publication content", () => {
    const fn = readFileSync(new URL("../../netlify/functions/djen-process.mjs", import.meta.url), "utf8")
    const ui = readFileSync(new URL("../pages/DecisionIntelligence.tsx", import.meta.url), "utf8")
    expect(fn).toContain('new URL("/auth/v1/user", supabaseUrl)')
    expect(fn).toContain('"https://comunicaapi.pje.jus.br/api/v1/comunicacao"')
    expect(fn).toContain('query.searchParams.set("numeroProcesso", processNumber)')
    expect(fn).toContain('query.searchParams.set("size", "5")')
    expect(fn).toContain('query.searchParams.set("page", "0")')
    expect(fn).toContain('const processNumber =')
    expect(fn).not.toContain('const process =')
    expect(fn).not.toContain(".from(")
    expect(fn).not.toContain("localStorage")
    expect(ui).toContain("Consultar DJEN (CNJ)")
    expect(ui).toContain('payload?.error === "local_throttle"')
    expect(ui).toContain("Aguarde 10 segundos antes de consultar novamente este processo.")
    expect(ui).toContain("Nenhuma publicação desta consulta entra automaticamente no DNA do Juiz")
  })
})
