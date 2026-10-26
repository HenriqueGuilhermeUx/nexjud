import type { LegislationStagedDocument } from "./legislationBatchStaging";
import { verifyLegislationStagedSource } from "./legislationSourceIntegrity";

/**
 * These are candidate publication hosts for a narrowly scoped federal-law
 * pilot, not a universal list of authoritative Brazilian legal sources.
 * The URL is never fetched automatically, and a host match is NOT proof of
 * official text, validity, consolidation, or current vigency.
 */
const FEDERAL_REVIEW_HOSTS = new Set([
  "www.planalto.gov.br",
  "planalto.gov.br",
  "www.in.gov.br",
  "in.gov.br",
  "legis.senado.leg.br",
  "www2.camara.leg.br",
]);

export type OfficialSourceCandidate = Readonly<{
  url: string;
  accessedAt: string; // full ISO-8601 UTC timestamp captured by the reviewer
  passage: string;    // independently copied excerpt, not a source-derived URL fetch
  recordedBy: string; // reviewer or capture process identifier, never an auth token
}>;

export type LegislationOfficialReviewPacket = Readonly<{
  identity: string;
  sourceSha256: string;
  sourceUrl: string;
  sourcePassage: string;
  officialCandidate: Readonly<{
    url: string;
    accessedAt: string;
    recordedBy: string;
    passage: string;
    passageSha256: string;
  }>;
  comparison: Readonly<{
    sameTextIgnoringWhitespace: boolean;
    method: "whitespace-only";
  }>;
  reviewStatus: "PENDING_INDEPENDENT_OFFICIAL_REVIEW";
  verifiedAgainstOfficialSource: false;
  safeToCiteAsOfficial: false;
  effectiveDateDetermined: false;
}>;

function parseCandidateUrl(input: string): URL {
  if (typeof input !== "string" || input.length > 2000 ||
      /[\u0000-\u001f\u007f]/.test(input)) {
    throw new Error("LEGAL_OFFICIAL_REVIEW_URL_INVALID");
  }
  let url: URL;
  try { url = new URL(input); }
  catch { throw new Error("LEGAL_OFFICIAL_REVIEW_URL_INVALID"); }
  if (url.protocol !== "https:" || url.username || url.password ||
      url.hash || url.hostname.endsWith(".") ||
      !FEDERAL_REVIEW_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error("LEGAL_OFFICIAL_REVIEW_URL_NOT_ALLOWED");
  }
  return url;
}

function isUtcTimestamp(input: string): boolean {
  if (typeof input !== "string" ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(input)) return false;
  const timestamp = new Date(input);
  return Number.isFinite(timestamp.getTime()) &&
    timestamp.toISOString().slice(0, 19) === input.slice(0, 19);
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

async function sha256(text: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256", new TextEncoder().encode(text),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * Prepares side-by-side *candidate* evidence for an authorized human review.
 * The source bytes must first match the pinned, third-party staging record.
 *
 * Importantly, no internet fetch, legal-status inference, DB update, RAG
 * publication, positive verification, or citation permission occurs here.
 * Even an exact passage match is not a proof of current authoritative text.
 */
export async function buildLegislationOfficialReviewPacket(
  staged: LegislationStagedDocument,
  originalMarkdown: string,
  sourcePassage: string,
  candidate: OfficialSourceCandidate,
): Promise<LegislationOfficialReviewPacket> {
  await verifyLegislationStagedSource(staged, originalMarkdown);
  if (typeof sourcePassage !== "string" || sourcePassage.length < 20 ||
      sourcePassage.length > 12_000 || !staged.record.text.includes(sourcePassage)) {
    throw new Error("LEGAL_OFFICIAL_REVIEW_SOURCE_PASSAGE_INVALID");
  }
  if (!candidate || typeof candidate.passage !== "string" ||
      candidate.passage.length < 20 || candidate.passage.length > 12_000 ||
      !normalizeWhitespace(candidate.passage) ||
      typeof candidate.recordedBy !== "string" ||
      !/^[a-zA-Z0-9._@-]{3,128}$/.test(candidate.recordedBy) ||
      !isUtcTimestamp(candidate.accessedAt)) {
    throw new Error("LEGAL_OFFICIAL_REVIEW_EVIDENCE_INVALID");
  }
  const officialUrl = parseCandidateUrl(candidate.url);
  return {
    identity: staged.identity,
    sourceSha256: staged.sha256,
    sourceUrl: staged.record.sourceUrl,
    sourcePassage,
    officialCandidate: {
      url: officialUrl.href,
      accessedAt: candidate.accessedAt,
      recordedBy: candidate.recordedBy,
      passage: candidate.passage,
      passageSha256: await sha256(candidate.passage),
    },
    comparison: {
      sameTextIgnoringWhitespace:
        normalizeWhitespace(sourcePassage) === normalizeWhitespace(candidate.passage),
      method: "whitespace-only",
    },
    reviewStatus: "PENDING_INDEPENDENT_OFFICIAL_REVIEW",
    verifiedAgainstOfficialSource: false,
    safeToCiteAsOfficial: false,
    effectiveDateDetermined: false,
  };
}
