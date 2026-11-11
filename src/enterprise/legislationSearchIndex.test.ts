import { describe, expect, it } from "vitest";
import { parseLegislationSourceMarkdown } from "./legislationSourcePilot";
import { createLegislationSearchIndex } from "./legislationSearchIndex";

const source = [
  "---",
  'titulo: "Lei nº 10.406 de 10/01/2002"',
  'tipo: "Lei Ordinária"',
  'numero: "10406"',
  "data: 2002-01-10",
  'versao_texto: "compilada"',
  'urn: "urn:lex:br:federal:lei:2002-01-10;10406"',
  'fonte: "https://normas.leg.br/?urn=urn:lex:br:federal:lei:2002-01-10;10406"',
  "---",
  "# Lei nº 10.406 de 10/01/2002",
  "**Art. 1º** Toda pessoa é capaz de direitos e deveres na ordem civil.",
  "**Art. 2º** A personalidade civil da pessoa começa do nascimento com vida.",
].join("\n");
const staged = () => [{
  relativePath: "federal/2002/10406.md",
  identity: "urn:lex:br:federal:lei:2002-01-10;10406",
  sha256: "a".repeat(64),
  record: parseLegislationSourceMarkdown(source),
}];

describe("legislation offline search index", () => {
  it("locates accents, returns verifiable source metadata but no official citation claims", () => {
    const idx = createLegislationSearchIndex(staged());
    expect(idx.count).toBe(2);
    const result = idx.search("personalidade civil");
    expect(result).toHaveLength(1);
    expect(result[0].article).toBe("2");
    expect(result[0].sourceUrl).toContain("normas.leg.br");
    expect(result[0].safeToCiteAsOfficial).toBe(false);
    expect(result[0].verifiedAgainstOfficialSource).toBe(false);
    expect(result[0].sha256).toBe("a".repeat(64));
    expect(idx.search("NASCIMENTO VIDA")).toHaveLength(1);
    expect(idx.search("inexistente")).toHaveLength(0);
  });
  it("enforces size, official verification and query bounds", () => {
    const idx = createLegislationSearchIndex(staged());
    expect(() => idx.search("a".repeat(141))).toThrow(/INVALID_INPUT/);
    expect(() => idx.search("vida", 31)).toThrow(/INVALID_INPUT/);
    const docs = staged();
    docs[0].sha256 = "invalid";
    expect(() => createLegislationSearchIndex(docs)).toThrow(/UNVERIFIED_INPUT/);
  });
});
