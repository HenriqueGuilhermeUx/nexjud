import type { LegislationSourceRecord } from "./legislationSourcePilot";

export type ExtractedLegalArticle = Readonly<{
  article: string;
  heading: string;
  text: string;
  sourceUrl: string;
  urn: string | null;
  normNumber: string;
  retrievedAt: string | null;
  textVersion: string | null;
  verifiedAgainstOfficialSource: false;
  safeToCiteAsOfficial: false;
}>;

/**
 * Conservative extraction of already staged legal markdown.
 * This tool copies source text as-is and does NOT determine vigency,
 * repeal, interpretation, jurisdiction or official citation validity.
 */
export function extractLegislationArticles(
  record: LegislationSourceRecord,
  limit = 300,
): readonly ExtractedLegalArticle[] {
  if (!record || record.provenance !== "ctresb/leis" ||
      record.verifiedAgainstOfficialSource !== false ||
      record.safeToCiteAsOfficial !== false) {
    throw new Error("LEGAL_SOURCE_NOT_STAGED");
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
    throw new Error("LEGAL_ARTICLE_INVALID_LIMIT");
  }
  const markdown = record.text;
  if (markdown.length > 1_000_000) throw new Error("LEGAL_ARTICLE_TEXT_TOO_LARGE");
  const regex = /^\s*\*\*(Art\.\s*(\d+[A-Za-z]?(?:-[A-Za-z])?)[º°.]?)\*\*/gm;
  const headings = [...markdown.matchAll(regex)];
  const output: ExtractedLegalArticle[] = [];
  for (const [i, heading] of headings.entries()) {
    if (output.length >= limit) break;
    const start = heading.index!;
    const end = headings[i + 1]?.index ?? markdown.length;
    const segment = markdown.slice(start, end).trim();
    if (segment.length > 60_000) {
      throw new Error("LEGAL_ARTICLE_SEGMENT_TOO_LARGE");
    }
    output.push({
      article: heading[2],
      heading: heading[1],
      text: segment,
      sourceUrl: record.sourceUrl,
      urn: record.urn,
      normNumber: record.number,
      retrievedAt: record.retrievedAt,
      textVersion: record.textVersion,
      verifiedAgainstOfficialSource: false,
      safeToCiteAsOfficial: false,
    });
  }
  return output;
}
