import type { LegislationStagedDocument } from "./legislationBatchStaging";
import { extractLegislationArticles } from "./legislationArticleExtract";

export type LegislationRevisionChange = Readonly<{
  article: string;
  kind: "added" | "removed" | "changed";
  oldExcerpt: string | null;
  newExcerpt: string | null;
}>;

export type LegislationRevisionReview = Readonly<{
  normIdentity: string;
  oldSha256: string;
  newSha256: string;
  oldSourceUrl: string;
  newSourceUrl: string;
  oldTextVersion: string | null;
  newTextVersion: string | null;
  changes: readonly LegislationRevisionChange[];
  matchedArticles: number;
  requiresHumanLegalReview: true;
  effectiveDateEstablished: false;
  verifiedAgainstOfficialSource: false;
  safeToCiteAsOfficial: false;
}>;

function excerpt(s: string): string {
  return s.replace(/\r\n/g, "\n").trim().slice(0, 500);
}

function mapArticles(document: LegislationStagedDocument) {
  const entries = extractLegislationArticles(document.record, 1000);
  const map = new Map<string, string>();
  for (const entry of entries) {
    // Ambiguous duplicate numbering must not be silently reconciled.
    if (map.has(entry.article)) throw new Error("LEGAL_REVISION_DUPLICATE_ARTICLE");
    map.set(entry.article, entry.text.replace(/\r\n/g, "\n").trim());
  }
  if (!map.size) throw new Error("LEGAL_REVISION_NO_ARTICLES");
  return map;
}

/**
 * Offline review queue for two *source-only* versions of the same instrument.
 * Article alignment is not proof of amendment/effectiveness and is never
 * applied to the live legal index automatically.
 */
export function compareLegislationSourceVersions(
  previous: LegislationStagedDocument,
  incoming: LegislationStagedDocument,
): LegislationRevisionReview {
  if (!previous || !incoming || !previous.identity ||
      previous.identity !== incoming.identity ||
      !/^[a-f0-9]{64}$/.test(previous.sha256) ||
      !/^[a-f0-9]{64}$/.test(incoming.sha256) ||
      previous.record.safeToCiteAsOfficial !== false ||
      incoming.record.safeToCiteAsOfficial !== false ||
      previous.record.verifiedAgainstOfficialSource !== false ||
      incoming.record.verifiedAgainstOfficialSource !== false) {
    throw new Error("LEGAL_REVISION_INVALID_PAIR");
  }
  const old = mapArticles(previous);
  const next = mapArticles(incoming);
  const keys = [...new Set([...old.keys(), ...next.keys()])]
    .sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10) || a.localeCompare(b));
  const changes: LegislationRevisionChange[] = [];
  let matched = 0;
  for (const key of keys) {
    const a = old.get(key);
    const b = next.get(key);
    if (a !== undefined && b !== undefined) matched++;
    if (a === b) continue;
    changes.push({
      article: key,
      kind: a === undefined ? "added" : b === undefined ? "removed" : "changed",
      oldExcerpt: a === undefined ? null : excerpt(a),
      newExcerpt: b === undefined ? null : excerpt(b),
    });
    if (changes.length > 1000) throw new Error("LEGAL_REVISION_TOO_MANY_CHANGES");
  }
  return {
    normIdentity: previous.identity,
    oldSha256: previous.sha256,
    newSha256: incoming.sha256,
    oldSourceUrl: previous.record.sourceUrl,
    newSourceUrl: incoming.record.sourceUrl,
    oldTextVersion: previous.record.textVersion,
    newTextVersion: incoming.record.textVersion,
    changes,
    matchedArticles: matched,
    requiresHumanLegalReview: true,
    effectiveDateEstablished: false,
    verifiedAgainstOfficialSource: false,
    safeToCiteAsOfficial: false,
  };
}
