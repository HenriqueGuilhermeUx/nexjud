import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { classifyKind, cleanText, detectOutcome, normalizeItem, outcomeCounts } from "../../supabase/functions/_shared/djen"

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")

describe("dossiê do juízo com publicações do DJEN", () => {
  it("limpa o HTML das publicações", () => {
    expect(cleanText("<p>SENTENÇA</p><br/>Vistos.&nbsp;Julgo&amp;decido")).toBe("SENTENÇA\nVistos. Julgo&decido")
  })

  it("classifica o tipo do ato", () => {
    expect(classifyKind("Sentença", "Vistos.")).toBe("sentenca")
    expect(classifyKind("", "EMENTA: APELAÇÃO CÍVEL")).toBe("acordao")
    expect(classifyKind("Intimação", "Vistos. Defiro a tutela.")).toBe("decisao")
    expect(classifyKind("Despacho", "Cite-se.")).toBe("despacho")
    expect(classifyKind("Intimação", "Fica intimada a parte para recolher custas.")).toBe("outro")
    expect(classifyKind("DESPACHO/DECISÃO", "Cumprimento de Sentença. Manifeste-se o exequente.")).toBe("despacho")
    expect(classifyKind("DESPACHO/DECISÃO", "Cumprimento de Sentença. Defiro a penhora on-line.")).toBe("decisao")
  })

  it("lê o dispositivo sem confundir parcial com total", () => {
    expect(detectOutcome("Ante o exposto, JULGO PARCIALMENTE PROCEDENTE o pedido")).toBe("parcialmente_procedente")
    expect(detectOutcome("julgo improcedentes os pedidos")).toBe("improcedente")
    expect(detectOutcome("JULGO PROCEDENTE o pedido para condenar")).toBe("procedente")
    expect(detectOutcome("julgo extinto o processo, sem resolução do mérito, nos termos do art. 485")).toBe("extinto_sem_merito")
    expect(detectOutcome("Homologo o acordo")).toBe("homologacao")
    expect(detectOutcome("Cite-se.")).toBeNull()
  })

  it("normaliza um item e só aceita link de tribunal", () => {
    const item = normalizeItem({
      hash: "abc", idOrgao: 100590, data_disponibilizacao: "2026-11-20", siglaTribunal: "TJSP", nomeOrgao: "2ª Vara Cível",
      numeroprocessocommascara: "1000123-45.2024.8.26.0100", tipoDocumento: "Sentença",
      texto: "<p>JULGO PROCEDENTE o pedido.</p>", link: "https://esaj.tjsp.jus.br/x",
    })
    expect(item?.kind).toBe("sentenca")
    expect(item?.outcome).toBe("procedente")
    expect(item?.link).toBe("https://esaj.tjsp.jus.br/x")
    expect(item?.judgingBodyId).toBe("100590")
    expect(normalizeItem({ hash: "x", texto: "a", link: "https://evil.example.com" })?.link).toBeNull()
    expect(outcomeCounts([item!, item!])).toEqual({ procedente: 2 })
  })

  it("o DNA do Juiz usa o DJEN e não promete resultado", () => {
    const fn = read("../../supabase/functions/decision-intelligence/index.ts")
    expect(fn).toContain("djenByProcess(")
    expect(fn).toContain("djenByJudgingBody(")
    expect(fn).toContain("requireUser(req")
    expect(fn).toMatch(/Nunca dê percentuais/)
    expect(fn).not.toMatch(/successProbability|probability:/)
  })

  it("web, PWA e app mostram o dossiê", () => {
    expect(read("../pages/DecisionIntelligence.tsx")).toContain("<JudgeDossierPanel")
    expect(read("../pages/CompanionPWA.tsx")).toContain("<JudgeDossierPWA")
    expect(read("../../mobile/App.tsx")).toContain("DOSSIÊ DO JUÍZO")
  })

  it("o repasse do DJEN roda em São Paulo, exige a service role e só aceita filtros conhecidos", () => {
    const relay = read("../../supabase/functions/djen-relay/index.ts")
    expect(relay).toContain("SUPABASE_SERVICE_ROLE_KEY")
    expect(relay).toContain("comunicaapi.pje.jus.br/api/v1/comunicacao")
    expect(relay).toContain("invalid_param")
    const djen = read("../../supabase/functions/_shared/djen.ts")
    expect(djen).toContain('"x-region": "sa-east-1"')
    expect(djen).toContain('texto: "julgo"')
    expect(djen).toContain("orgaoId: judgingBodyId")
  })
})
