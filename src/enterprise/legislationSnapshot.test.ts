import { describe, expect, it } from "vitest";
import { parseLegislationSourceMarkdown } from "./legislationSourcePilot";
import {
  exportLegislationDraftSnapshot, importLegislationDraftSnapshot,
} from "./legislationSnapshot";

const markdown = [
  "---", 'titulo: "Lei exemplo"', 'tipo: "Lei Ordinária"',
  'numero: "123"', "data: 2026-01-06",
  'versao_texto: "original"', 'fonte: "https://normas.leg.br/lei/123"',
  "---", "# Lei exemplo",
  "**Art. 1º** Direitos fundamentais são assegurados.",
  "**Art. 2º** A personalidade civil acompanha o nascimento com vida.",
].join("\n");

function fixture() {
  return [{ relativePath: "federal/123.md", identity: "br:lei:123",
    sha256: "a".repeat(64), record: parseLegislationSourceMarkdown(markdown) }];
}

describe("legislation offline export/import", () => {
  it("restores deterministic searches without official verification claims", async () => {
    const first = await exportLegislationDraftSnapshot(fixture());
    const second = await exportLegislationDraftSnapshot(fixture());
    expect(first).toBe(second);
    const imported = await importLegislationDraftSnapshot(first);
    expect(imported.documents).toHaveLength(1);
    expect(imported.index.search("nascimento vida")[0].article).toBe("2");
    expect(imported.index.search("nascimento vida")[0].safeToCiteAsOfficial).toBe(false);
    expect(imported.officialVerification).toBe(false);
  });
  it("detects accidental corruption and rejects forged official claims", async () => {
    const original = await exportLegislationDraftSnapshot(fixture());
    const altered = JSON.parse(original);
    altered.content.documents[0].record.text += " altered";
    await expect(importLegislationDraftSnapshot(JSON.stringify(altered)))
      .rejects.toThrow(/CHECKSUM_MISMATCH/);
    altered.content.documents[0].record.safeToCiteAsOfficial = true;
    await expect(importLegislationDraftSnapshot(JSON.stringify(altered)))
      .rejects.toThrow(/BAD_DOCUMENT/);
  });
  it("rejects duplicate norm identities", async () => {
    const values = fixture();
    values.push({...values[0],relativePath:"federal/copy.md"});
    await expect(exportLegislationDraftSnapshot(values)).rejects.toThrow(/DUPLICATE_NORM/);
  });
});
