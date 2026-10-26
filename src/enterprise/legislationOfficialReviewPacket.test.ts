import { describe, expect, it } from "vitest";
import { stageLegislationSourceBatch } from "./legislationBatchStaging";
import {
  buildLegislationOfficialReviewPacket,
  type OfficialSourceCandidate,
} from "./legislationOfficialReviewPacket";

const passage = "O conteúdo original precisa ser preservado.";
const sourcePassage = "**Art. 1º** O conteúdo original precisa ser preservado.";
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
  sourcePassage,
].join("\n");

async function staged() {
  const batch = await stageLegislationSourceBatch([
    { path: "federal/leis-ordinarias/2026/123.md", markdown },
  ]);
  expect(batch.accepted).toHaveLength(1);
  return batch.accepted[0];
}

const candidate: OfficialSourceCandidate = {
  url: "https://www.planalto.gov.br/ccivil_03/leis/2026/l123.htm",
  accessedAt: "2026-10-26T21:00:00Z",
  passage: sourcePassage,
  recordedBy: "legal-reviewer-test",
};

describe("legislation official-source review packet (never authorizes citation)", () => {
  it("creates traceable comparison but never promotes third-party content to official", async () => {
    const doc = await staged();
    const result = await buildLegislationOfficialReviewPacket(
      doc, markdown, sourcePassage, candidate,
    );
    expect(result.identity).toBe(doc.identity);
    expect(result.sourceSha256).toBe(doc.sha256);
    expect(result.officialCandidate.passageSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.comparison.sameTextIgnoringWhitespace).toBe(true);
    expect(result.verifiedAgainstOfficialSource).toBe(false);
    expect(result.safeToCiteAsOfficial).toBe(false);
    expect(result.effectiveDateDetermined).toBe(false);
    expect(result.reviewStatus).toBe("PENDING_INDEPENDENT_OFFICIAL_REVIEW");
  });

  it("preserves mismatch and no-auto-citation status for different official candidate", async () => {
    const result = await buildLegislationOfficialReviewPacket(
      await staged(), markdown, sourcePassage,
      { ...candidate, passage: passage + " Alterado após publicação." },
    );
    expect(result.comparison.sameTextIgnoringWhitespace).toBe(false);
    expect(result.safeToCiteAsOfficial).toBe(false);
  });

  it("rejects identity/source tampering before comparing external excerpts", async () => {
    const doc = await staged();
    await expect(buildLegislationOfficialReviewPacket(
      doc, markdown + " modificado", sourcePassage, candidate,
    )).rejects.toThrow(/HASH_MISMATCH/);
    await expect(buildLegislationOfficialReviewPacket(
      doc, markdown, "Trecho que não existe no documento de origem.", candidate,
    )).rejects.toThrow(/SOURCE_PASSAGE_INVALID/);
  });

  it("rejects spoofed hosts, protocols, credentials, fragments and trailing-dot hosts", async () => {
    const doc = await staged();
    for (const url of [
      "http://www.planalto.gov.br/ccivil_03/leis/2026/l123.htm",
      "https://www.planalto.gov.br.attacker.example/lei",
      "https://planalto.gov.br.evil.example/lei",
      "https://me:secret@www.planalto.gov.br/lei",
      "https://www.planalto.gov.br./lei",
      "https://www.planalto.gov.br/lei#changed",
      "https://www.lexml.gov.br/lei",
    ]) {
      await expect(buildLegislationOfficialReviewPacket(
        doc, markdown, sourcePassage, { ...candidate, url },
      )).rejects.toThrow(/URL_NOT_ALLOWED/);
    }
  });

  it("rejects fabricated collection date or empty candidate evidence", async () => {
    const doc = await staged();
    for (const value of [
      { accessedAt: "2026-02-30T21:00:00Z" },
      { accessedAt: "2026-10-26" },
      { recordedBy: "x" },
      { passage: "" },
      { passage: "x".repeat(12_001) },
    ]) {
      await expect(buildLegislationOfficialReviewPacket(
        doc, markdown, sourcePassage, { ...candidate, ...value },
      )).rejects.toThrow(/EVIDENCE_INVALID/);
    }
  });
});
