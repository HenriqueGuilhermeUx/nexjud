import { describe, expect, it } from "vitest";
import type { LegislationStagedDocument } from "./legislationBatchStaging";
import { parseLegislationSourceMarkdown } from "./legislationSourcePilot";
import { compareLegislationSourceVersions } from "./legislationRevisionReview";

function law(sha: string, a1: string, a2?: string): LegislationStagedDocument {
  const parts = [
    "---", 'titulo: "Lei nº 123"', 'tipo: "Lei Ordinária"',
    'numero: "123"', 'versao_texto: "texto de referência"',
    'fonte: "https://normas.leg.br/lei/123"', "---", "# Lei nº 123",
    "**Art. 1º** " + a1,
  ];
  if (a2) parts.push("**Art. 2º** " + a2);
  return {relativePath: "federal/123.md", identity: "urn:br:lei:123",
    sha256: sha.repeat(64), record: parseLegislationSourceMarkdown(parts.join("\n"))};
}

describe("NexJud source revision quarantine", () => {
  it("provides review-only article changes without deciding law effectiveness", () => {
    const result = compareLegislationSourceVersions(
      law("a", "Redação anterior válida.", "Artigo antigo."),
      law("b", "Nova redação a conferir.", "Artigo antigo."),
    );
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0].kind).toBe("changed");
    expect(result.changes[0].article).toBe("1");
    expect(result.matchedArticles).toBe(2);
    expect(result.requiresHumanLegalReview).toBe(true);
    expect(result.effectiveDateEstablished).toBe(false);
    expect(result.safeToCiteAsOfficial).toBe(false);
  });
  it("marks inserted and removed articles without inferring repeal", () => {
    const a = law("a", "Um artigo apenas.");
    const b = law("b", "Um artigo apenas.", "Segundo artigo incluído.");
    expect(compareLegislationSourceVersions(a,b).changes[0].kind).toBe("added");
    expect(compareLegislationSourceVersions(b,a).changes[0].kind).toBe("removed");
  });
  it("blocks unrelated norms and unverifiable claims", () => {
    const a = law("a", "Texto antigo.");
    const b = law("b", "Texto novo.");
    b.identity = "outro";
    expect(() => compareLegislationSourceVersions(a,b)).toThrow(/INVALID_PAIR/);
    b.identity = a.identity;
    (b.record as unknown as {verifiedAgainstOfficialSource:boolean})
      .verifiedAgainstOfficialSource = true;
    expect(() => compareLegislationSourceVersions(a,b)).toThrow(/INVALID_PAIR/);
  });
});
