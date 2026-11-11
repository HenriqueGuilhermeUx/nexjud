import type { LegislationStagedDocument } from "./legislationBatchStaging";
import { parseLegislationSourceMarkdown } from "./legislationSourcePilot";

export type LegislationSourceIntegrity = Readonly<{
  accepted: true;
  sha256: string;
  identity: string;
  originalSourceContentVerified: true;
  verifiedAgainstOfficialSource: false;
  safeToCiteAsOfficial: false;
}>;

/**
 * Confirms a staged record is still the *same bytes* as the provided
 * third-party public source file. It does NOT assert that the third-party
 * text matches the government's published authoritative version.
 */
export async function verifyLegislationStagedSource(
  staged: LegislationStagedDocument,
  originalMarkdown: string,
): Promise<LegislationSourceIntegrity> {
  if (!staged || typeof originalMarkdown !== "string" ||
      originalMarkdown.length > 1_000_000 ||
      !/^[a-f0-9]{64}$/.test(staged.sha256 || "") ||
      typeof staged.identity !== "string" ||
      staged.record?.verifiedAgainstOfficialSource !== false ||
      staged.record?.safeToCiteAsOfficial !== false) {
    throw new Error("LEGAL_SOURCE_INTEGRITY_INVALID_INPUT");
  }
  const normalized = originalMarkdown.replace(/\r\n/g, "\n");
  const bytes = new TextEncoder().encode(normalized);
  const hash = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  const actual = Array.from(new Uint8Array(hash),
    (n) => n.toString(16).padStart(2, "0")).join("");
  if (actual !== staged.sha256) {
    throw new Error("LEGAL_SOURCE_INTEGRITY_HASH_MISMATCH");
  }

  const parsed = parseLegislationSourceMarkdown(originalMarkdown);
  const identity = parsed.urn?.trim() ||
    [parsed.state || "federal", parsed.instrumentType, parsed.number,
      parsed.date || "undated"].join(":").toLowerCase();
  if (identity !== staged.identity ||
      parsed.title !== staged.record.title ||
      parsed.number !== staged.record.number ||
      parsed.instrumentType !== staged.record.instrumentType ||
      parsed.date !== staged.record.date ||
      parsed.state !== staged.record.state ||
      parsed.statusReported !== staged.record.statusReported ||
      parsed.revokedReported !== staged.record.revokedReported ||
      parsed.retrievedAt !== staged.record.retrievedAt ||
      parsed.urn !== staged.record.urn ||
      parsed.sourceUrl !== staged.record.sourceUrl ||
      parsed.text !== staged.record.text ||
      parsed.textVersion !== staged.record.textVersion) {
    throw new Error("LEGAL_SOURCE_INTEGRITY_METADATA_MISMATCH");
  }
  return {
    accepted: true,
    sha256: actual,
    identity,
    originalSourceContentVerified: true,
    verifiedAgainstOfficialSource: false,
    safeToCiteAsOfficial: false,
  };
}
