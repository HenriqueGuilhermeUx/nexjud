import { describe, expect, it } from "vitest";
import { stageLegislationSourceBatch } from "./legislationBatchStaging";
import { verifyLegislationStagedSource } from "./legislationSourceIntegrity";

const markdown = [
  "---",
  'titulo: "Lei nº 123"',
  'tipo: "Lei Ordinária"',
  'numero: "123"',
  "data: 2026-01-06",
  'versao_texto: "original"',
  'urn: "urn:lex:br:federal:lei:2026-01-06;123"',
  'fonte: "https://normas.leg.br/?urn=urn:lex:br:federal:lei:2026-01-06;123"',
  "---",
  "# Lei nº 123",
  "**Art. 1º** O conteúdo original precisa ser preservado.",
].join("\n");

describe("legislation source bytes versus staging hash", () => {
  it("rechecks full source bytes, original record and preserves legal disclaimer", async () => {
    const output = await stageLegislationSourceBatch([{
      path: "federal/leis-ordinarias/2026/123.md", markdown,
    }]);
    expect(output.accepted).toHaveLength(1);
    const good = await verifyLegislationStagedSource(output.accepted[0], markdown);
    expect(good.originalSourceContentVerified).toBe(true);
    expect(good.verifiedAgainstOfficialSource).toBe(false);
    expect(good.safeToCiteAsOfficial).toBe(false);
  });

  it("rejects modified source text and forged metadata even when the SHA is unchanged", async () => {
    const staged = (await stageLegislationSourceBatch([{
      path: "federal/leis-ordinarias/2026/123.md", markdown,
    }])).accepted[0];
    await expect(verifyLegislationStagedSource(staged, markdown + " alterado"))
      .rejects.toThrow(/HASH_MISMATCH/);
    const altered = {...staged, record: {...staged.record, title: "Outro título"}};
    await expect(verifyLegislationStagedSource(altered, markdown))
      .rejects.toThrow(/METADATA_MISMATCH/);
    const statusTampered = {
      ...staged,
      record: {...staged.record, revokedReported: true, retrievedAt: "2026-10-25"},
    };
    await expect(verifyLegislationStagedSource(statusTampered, markdown))
      .rejects.toThrow(/METADATA_MISMATCH/);

  });
});
