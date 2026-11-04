import { describe, expect, it } from "vitest"
import { screenDjenCommunication, redactKnownIdentifiers } from "./djenIntakeGate"

const source = "https://comunica.pje.jus.br/consulta"
const court = "TJSP"
const full = "SENTENÇA. Examinados os documentos, considero a prova insuficiente para demonstrar o nexo causal. Por isso julgo improcedente o pedido. Fundamentação nos autos, sujeita à revisão."

describe("DJEN public communication safety gate", () => {
  it("never treats a DJEN publication as approved judge DNA without review", () => {
    const result = screenDjenCommunication({ text: full, publicSourceUrl: source, court })
    expect(result.kind).toBe("sentenca")
    expect(result.disposition).toBe("manual_review")
    expect(result.canIndexForJudgeDna).toBe(false)
    expect(result.safeToStoreRaw).toBe(false)
  })
  it("blocks secret or sealed proceeding signals", () => {
    const result = screenDjenCommunication({ text: full + " Segredo de justiça.", publicSourceUrl: source, court })
    expect(result.disposition).toBe("block")
    expect(result.flags).toContain("possible_sealed_proceeding")
  })
  it("blocks simple procedural orders from judge behavior inference", () => {
    const result = screenDjenCommunication({ text: "Despacho. Intime-se a parte para se manifestar sobre os documentos no prazo legal.", court, publicSourceUrl: source })
    expect(result.disposition).toBe("block")
    expect(result.flags).toContain("not_a_reasoned_decision")
  })
  it("does not admit records lacking a traceable public source", () => {
    expect(screenDjenCommunication({ text: full, court }).disposition).toBe("block")
    expect(screenDjenCommunication({ text: full, court, publicSourceUrl: "http://example.com" }).disposition).toBe("block")
  })
  it("flags identifiers and warns that simple redaction is insufficient", () => {
    const result = screenDjenCommunication({ text: full + " CPF 123.456.789-09 contato pessoa@example.com", court, publicSourceUrl: source })
    expect(result.flags).toContain("personal_identifiers_need_redaction")
    const redacted = redactKnownIdentifiers("CPF 123.456.789-09 contato pessoa@example.com")
    expect(redacted).not.toContain("123.456.789-09")
    expect(redacted).not.toContain("pessoa@example.com")
  })
})
