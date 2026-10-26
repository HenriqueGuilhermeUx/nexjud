import { describe, expect, it } from "vitest";
import { parseLegislationSourceMarkdown } from "./legislationSourcePilot";

const doc = [
  "---",
  'titulo: "Lei nº 10.406 de 10/01/2002"',
  'tipo: "Lei Ordinária"',
  'numero: "10406"',
  "data: 2002-01-10",
  'versao_texto: "compilada (texto vigente)"',
  "revogada: false",
  'fonte: "https://normas.leg.br/?urn=urn:lex:br:federal:lei:2002-01-10;10406"',
  "baixado_em: 2026-10-13",
  "---",
  "# Lei nº 10.406 de 10/01/2002",
  "",
  "Institui o Código Civil.",
].join("\n");

describe("ingestão legislativa: fonte externa nunca vira citação oficial automaticamente", () => {
  it("conserva metadados e proveniência", () => {
    const out = parseLegislationSourceMarkdown(doc);
    expect(out.number).toBe("10406");
    expect(out.date).toBe("2002-01-10");
    expect(out.revokedReported).toBe(false);
    expect(out.verifiedAgainstOfficialSource).toBe(false);
    expect(out.safeToCiteAsOfficial).toBe(false);
    expect(out.sourceUrl).toContain("normas.leg.br");
  });

  it("nega formatos malformados e origens inseguras", () => {
    expect(() => parseLegislationSourceMarkdown("# texto solto")).toThrow();
    expect(() => parseLegislationSourceMarkdown(doc.replace("https://normas.leg.br/", "javascript:alert(1)"))).toThrow();
    expect(() => parseLegislationSourceMarkdown(doc.replace("2002-01-10", "2002-02-30"))).toThrow();
  });

  it("não interpreta ausência de revogação como vigência confirmada", () => {
    const out = parseLegislationSourceMarkdown(doc.replace("revogada: false\n", ""));
    expect(out.revokedReported).toBeNull();
    expect(out.safeToCiteAsOfficial).toBe(false);
  });
});
