import type { LegislationStagedDocument } from "./legislationBatchStaging";
import { extractLegislationArticles } from "./legislationArticleExtract";

export type LegislationSearchHit = Readonly<{
  normIdentity: string;
  normNumber: string;
  article: string;
  title: string;
  sha256: string;
  sourceUrl: string;
  urn: string | null;
  version: string | null;
  excerpt: string;
  score: number;
  verifiedAgainstOfficialSource: false;
  safeToCiteAsOfficial: false;
}>;

type SearchEntry = Readonly<{
  text: string;
  normalized: string;
  hit: Omit<LegislationSearchHit, "excerpt" | "score">;
}>;

// All search is local and lexical. No upload, embeddings, LLM, external calls
// or inferred current validity. HTML is never produced by this module.
function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, " ").trim();
}

function excerpt(source: string, firstWord: string): string {
  const cleaned = source.replace(/\s+/g, " ").trim();
  const words = firstWord ? normalize(firstWord) : "";
  const tokens = cleaned.split(/\s+/);
  const at = words ? tokens.findIndex((token) => normalize(token).includes(words)) : -1;
  const center = at < 0 ? 0 : at;
  const start = Math.max(0, center - 14);
  const slice = tokens.slice(start, start + 45).join(" ");
  return (start ? "…" : "") + slice.slice(0, 320) + (start + 45 < tokens.length ? "…" : "");
}

export function createLegislationSearchIndex(documents: readonly LegislationStagedDocument[]) {
  if (!Array.isArray(documents) || documents.length > 50) {
    throw new Error("LEGAL_SEARCH_TOO_MANY_DOCUMENTS");
  }
  const rows: SearchEntry[] = [];
  for (const document of documents) {
    const record = document.record;
    if (!/^[a-f0-9]{64}$/.test(document.sha256) ||
        record.safeToCiteAsOfficial !== false ||
        record.verifiedAgainstOfficialSource !== false) {
      throw new Error("LEGAL_SEARCH_UNVERIFIED_INPUT_REQUIRED");
    }
    const articles = extractLegislationArticles(record);
    for (const article of articles) {
      const hit = {
        normIdentity: document.identity, normNumber: record.number,
        article: article.article, title: record.title,
        sha256: document.sha256, sourceUrl: record.sourceUrl,
        urn: record.urn, version: record.textVersion,
        verifiedAgainstOfficialSource: false as const,
        safeToCiteAsOfficial: false as const,
      };
      rows.push({ hit, text: article.text, normalized: normalize(article.text) });
      if (rows.length > 12000) throw new Error("LEGAL_SEARCH_INDEX_LIMIT");
    }
  }
  return Object.freeze({
    count: rows.length,
    provenance: "ctresb/leis" as const,
    officialVerification: false as const,
    /**
     * Returns discovery excerpts, never legal assertions or official citations.
     */
    search(query: string, limit = 10): readonly LegislationSearchHit[] {
      if (typeof query !== "string" || query.length > 140 ||
          !Number.isInteger(limit) || limit < 1 || limit > 30) {
        throw new Error("LEGAL_SEARCH_INVALID_INPUT");
      }
      const normalized = normalize(query);
      const terms = [...new Set(normalized.split(/\s+/).filter((term) => term.length >= 2))].slice(0, 12);
      if (!terms.length) return [];
      const results: LegislationSearchHit[] = [];
      for (const row of rows) {
        if (!terms.every((term) => row.normalized.includes(term))) continue;
        const exactPhrase = row.normalized.includes(normalized);
        const score = terms.reduce((sum, term) => {
          const regex = new RegExp("(^| )" + term + "(?= |$)", "g");
          return sum + Math.min([...row.normalized.matchAll(regex)].length, 5);
        }, 0) + (exactPhrase ? 5 : 0);
        results.push({ ...row.hit, excerpt: excerpt(row.text, terms[0]), score });
      }
      results.sort((a, b) =>
        b.score - a.score ||
        a.normNumber.localeCompare(b.normNumber, "pt-BR") ||
        Number(a.article) - Number(b.article) ||
        a.article.localeCompare(b.article, "pt-BR")
      );
      return results.slice(0, limit);
    },
  });
}
