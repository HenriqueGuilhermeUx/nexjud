import { describe, expect, it } from "vitest";
import { parseLegislationSourceMarkdown } from "./legislationSourcePilot";
import { extractLegislationArticles } from "./legislationArticleExtract";

const markdown = [
  "---",
  'titulo: "Lei nº 10.406 de 10/01/2002"',
  'tipo: "Lei Ordinária"',
  'numero: "10406"',
  "data: 2002-01-10",
  'versao_texto: "compilada (texto vigente)"',
  'urn: "urn:lex:br:federal:lei:2002-01-10;10406"',
  'fonte: "https://normas.leg.br/?urn=urn:lex:br:federal:lei:2002-01-10;10406"',
  "baixado_em: 2026-10-13",
  "---",
  "# Lei nº 10.406 de 10/01/2002",
  "",
  "**Art. 1º** Toda pessoa é capaz de direitos e deveres na ordem civil.",
  "",
  "**Art. 2º** A personalidade civil da pessoa começa do nascimento com vida.",
  "Parágrafo único. Texto de exemplo.",
].join("\n");

describe("source-only legal article extraction", () => {
  it("extracts article text verbatim with nonofficial provenance and limits", () => {
    const record = parseLegislationSourceMarkdown(markdown);
    const articles = extractLegislationArticles(record);
    expect(articles).toHaveLength(2);
    expect(articles[0].article).toBe("1");
    expect(articles[0].text).toContain("Toda pessoa é capaz");
    expect(articles[0].text).not.toContain("Art. 2");
    expect(articles[1].text).toContain("Parágrafo único.");
    expect(articles[1].sourceUrl).toContain("normas.leg.br");
    expect(articles[1].safeToCiteAsOfficial).toBe(false);
    expect(extractLegislationArticles(record, 1)).toHaveLength(1);
  });
  it("rejects invalid limits and fabricated official verification", () => {
    const record = parseLegislationSourceMarkdown(markdown);
    expect(() => extractLegislationArticles(record, -1)).toThrow();
    expect(() => extractLegislationArticles({
      ...record, verifiedAgainstOfficialSource: true,
    } as unknown as typeof record)).toThrow(/NOT_STAGED/);
  });
});
