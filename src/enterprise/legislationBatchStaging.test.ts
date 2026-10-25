import { describe, expect, it } from "vitest";
import { stageLegislationSourceBatch } from "./legislationBatchStaging";

const doc = (value: string) => [
  "---",
  'titulo: "Lei 123"',
  'tipo: "Lei Ordinária"',
  'numero: "123"',
  'data: 2025-01-02',
  'versao_texto: "original"',
  'urn: "urn:lex:br:federal:lei:2025-01-02;123"',
  'fonte: "https://www.planalto.gov.br/ccivil_03/test"',
  "---",
  "# Lei 123",
  "",
  value,
].join("\n");

describe("NexJud legislation batch staging", () => {
  it("stages records without claiming official verification", async () => {
    const result = await stageLegislationSourceBatch([{path: "federal/leis-ordinarias/2025/123.md", markdown: doc("Texto de exemplo válido.")}]);
    expect(result.accepted).toHaveLength(1);
    expect(result.accepted[0].sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.accepted[0].record.safeToCiteAsOfficial).toBe(false);
    expect(result.pendingReview).toHaveLength(0);
  });

  it("deduplicates identical versions and quarantines changed versions", async () => {
    const a = {path:"federal/2025/123.md", markdown:doc("Conteúdo A válido.")};
    const b = {path:"federal/2025/123-copy.md", markdown:doc("Conteúdo A válido.")};
    const duplicate = await stageLegislationSourceBatch([a,b]);
    expect(duplicate.accepted).toHaveLength(1);
    expect(duplicate.duplicatePaths).toEqual([b.path]);

    const conflict = await stageLegislationSourceBatch([a,{...b,markdown:doc("Conteúdo B alterado.")}]);
    expect(conflict.accepted).toHaveLength(0);
    expect(conflict.pendingReview.map(x=>x.reason)).toEqual(["CONFLICTING_NORM_VERSION","CONFLICTING_NORM_VERSION"]);
  });

  it("rejects path traversal and bad metadata without network or database calls", async () => {
    const result = await stageLegislationSourceBatch([
      {path:"../config/.env.md",markdown:doc("Conteúdo.")},
      {path:"federal/bad.md",markdown:"invalido"},
    ]);
    expect(result.accepted).toHaveLength(0);
    expect(result.pendingReview).toHaveLength(2);
  });
});
