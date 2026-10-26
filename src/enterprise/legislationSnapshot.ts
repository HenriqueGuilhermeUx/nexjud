import type { LegislationStagedDocument } from "./legislationBatchStaging";
import type { LegislationSourceRecord } from "./legislationSourcePilot";
import { createLegislationSearchIndex } from "./legislationSearchIndex";

const SNAPSHOT_VERSION = "nexjud-legislation-draft-v1";
const MAX_BYTES = 10_000_000;

type StoredLaw = Readonly<{
  relativePath: string;
  identity: string;
  sha256: string;
  record: LegislationSourceRecord;
}>;

type SnapshotContent = Readonly<{
  schemaVersion: typeof SNAPSHOT_VERSION;
  source: "ctresb/leis";
  officialVerification: false;
  documents: readonly StoredLaw[];
}>;

export type LegislationDraftSnapshot = Readonly<{
  content: SnapshotContent;
  checksum: string;
}>;

async function digest(content: string): Promise<string> {
  const bytes = new TextEncoder().encode(content);
  const hash = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash),
    (value) => value.toString(16).padStart(2, "0")).join("");
}

function validateDocument(value: unknown): asserts value is StoredLaw {
  if (!value || typeof value !== "object") throw new Error("LEGAL_SNAPSHOT_BAD_DOCUMENT");
  const doc = value as Partial<StoredLaw>;
  const record = doc.record as Partial<LegislationSourceRecord> | undefined;
  if (typeof doc.relativePath !== "string" || !/^[a-zA-Z0-9_/.-]+\.md$/.test(doc.relativePath) ||
      doc.relativePath.includes("..") || doc.relativePath.length > 300 ||
      typeof doc.identity !== "string" || doc.identity.length > 512 ||
      !/^[a-f0-9]{64}$/.test(doc.sha256 || "") ||
      !record || record.provenance !== "ctresb/leis" ||
      record.safeToCiteAsOfficial !== false ||
      record.verifiedAgainstOfficialSource !== false ||
      typeof record.text !== "string" || record.text.length > 1_000_000 ||
      typeof record.title !== "string" || typeof record.number !== "string" ||
      typeof record.instrumentType !== "string" || typeof record.sourceUrl !== "string" ||
      !record.sourceUrl.startsWith("https://")) {
    throw new Error("LEGAL_SNAPSHOT_BAD_DOCUMENT");
  }
}

function sortedAndValidated(documents: readonly LegislationStagedDocument[]): StoredLaw[] {
  if (!Array.isArray(documents) || documents.length > 50) {
    throw new Error("LEGAL_SNAPSHOT_DOCUMENT_LIMIT");
  }
  const identities = new Set<string>();
  const records = documents.map((doc) => {
    validateDocument(doc);
    if (identities.has(doc.identity)) throw new Error("LEGAL_SNAPSHOT_DUPLICATE_NORM");
    identities.add(doc.identity);
    return {
      relativePath: doc.relativePath, identity: doc.identity,
      sha256: doc.sha256, record: { ...doc.record },
    };
  });
  return records.sort((a, b) => a.identity.localeCompare(b.identity, "pt-BR"));
}

/**
 * Versioned JSON snapshot for manual review and isolated CI artifacts.
 * Checksum detects accidental changes but IS NOT a signature or official proof.
 */
export async function exportLegislationDraftSnapshot(
  documents: readonly LegislationStagedDocument[],
): Promise<string> {
  const content: SnapshotContent = {
    schemaVersion: SNAPSHOT_VERSION,
    source: "ctresb/leis",
    officialVerification: false,
    documents: sortedAndValidated(documents),
  };
  const encoded = JSON.stringify(content);
  if (new TextEncoder().encode(encoded).length > MAX_BYTES)
    throw new Error("LEGAL_SNAPSHOT_BYTES_LIMIT");
  const snapshot: LegislationDraftSnapshot = { content, checksum: await digest(encoded) };
  return JSON.stringify(snapshot);
}

export async function importLegislationDraftSnapshot(serialized: string) {
  if (typeof serialized !== "string" || new TextEncoder().encode(serialized).length > MAX_BYTES + 256)
    throw new Error("LEGAL_SNAPSHOT_BYTES_LIMIT");
  let snapshot: LegislationDraftSnapshot;
  try { snapshot = JSON.parse(serialized) as LegislationDraftSnapshot; }
  catch { throw new Error("LEGAL_SNAPSHOT_BAD_JSON"); }
  if (!snapshot || !snapshot.content ||
      snapshot.content.schemaVersion !== SNAPSHOT_VERSION ||
      snapshot.content.source !== "ctresb/leis" ||
      snapshot.content.officialVerification !== false ||
      typeof snapshot.checksum !== "string" ||
      !Array.isArray(snapshot.content.documents)) {
    throw new Error("LEGAL_SNAPSHOT_BAD_SCHEMA");
  }
  const rechecked = sortedAndValidated(snapshot.content.documents as LegislationStagedDocument[]);
  if (rechecked.length !== snapshot.content.documents.length ||
      rechecked.some((doc, i) => doc.identity !== snapshot.content.documents[i].identity)) {
    throw new Error("LEGAL_SNAPSHOT_UNSORTED");
  }
  if (await digest(JSON.stringify(snapshot.content)) !== snapshot.checksum) {
    throw new Error("LEGAL_SNAPSHOT_CHECKSUM_MISMATCH");
  }
  const index = createLegislationSearchIndex(rechecked);
  return { index, documents: rechecked, checksum: snapshot.checksum,
    officialVerification: false as const };
}
