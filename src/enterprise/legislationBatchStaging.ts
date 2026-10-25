import {
  parseLegislationSourceMarkdown,
  type LegislationSourceRecord,
} from "./legislationSourcePilot";

export type LegislationSourceFile = { path: string; markdown: string };
export type LegislationStagedDocument = {
  relativePath: string;
  identity: string;
  sha256: string;
  record: LegislationSourceRecord;
};
export type LegislationBatchResult = {
  accepted: LegislationStagedDocument[];
  duplicatePaths: string[];
  pendingReview: Array<{ path: string; reason: string; identity?: string }>;
  processed: number;
};

/**
 * In-memory staging only: no database writes and NO implicit official validation.
 * One bad document cannot accidentally overwrite another version of the same norm.
 */
export async function stageLegislationSourceBatch(
  files: LegislationSourceFile[],
): Promise<LegislationBatchResult> {
  if (!Array.isArray(files) || files.length > 50) {
    throw new Error("LEGAL_BATCH_LIMIT_EXCEEDED");
  }
  const accepted: LegislationStagedDocument[] = [];
  const duplicatePaths: string[] = [];
  const pendingReview: LegislationBatchResult["pendingReview"] = [];
  const seen = new Map<string, LegislationStagedDocument>();
  const paths = new Set<string>();
  let totalBytes = 0;

  for (const file of files) {
    const path = file?.path;
    if (typeof path !== "string" || path.length > 300 ||
        path.startsWith("/") || path.includes("..") ||
        !/^[a-zA-Z0-9_/.-]+\.md$/.test(path)) {
      pendingReview.push({ path: String(path), reason: "INVALID_SOURCE_PATH" });
      continue;
    }
    if (paths.has(path)) {
      pendingReview.push({ path, reason: "REPEATED_SOURCE_PATH" });
      continue;
    }
    paths.add(path);
    if (typeof file.markdown !== "string") {
      pendingReview.push({ path, reason: "INVALID_MARKDOWN" });
      continue;
    }
    const bytes = new TextEncoder().encode(file.markdown.replace(/\r\n/g, "\n"));
    totalBytes += bytes.length;
    if (totalBytes > 8_000_000) throw new Error("LEGAL_BATCH_BYTES_EXCEEDED");
    let record: LegislationSourceRecord;
    try {
      record = parseLegislationSourceMarkdown(file.markdown);
    } catch {
      pendingReview.push({ path, reason: "PARSE_OR_PROVENANCE_VALIDATION_FAILED" });
      continue;
    }

    const identity = record.urn?.trim() ||
      [record.state || "federal", record.instrumentType, record.number, record.date || "undated"].join(":").toLowerCase();
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    const sha256 = [...new Uint8Array(digest)]
      .map((value) => value.toString(16).padStart(2, "0")).join("");
    const previous = seen.get(identity);
    if (previous) {
      if (previous.sha256 === sha256) {
        duplicatePaths.push(path);
      } else {
        pendingReview.push({ path, identity, reason: "CONFLICTING_NORM_VERSION" });
        // Mark BOTH copies for manual review; no version is silently preferred.
        pendingReview.push({ path: previous.relativePath, identity, reason: "CONFLICTING_NORM_VERSION" });
        seen.delete(identity);
        const index = accepted.findIndex((value) => value.identity === identity);
        if (index >= 0) accepted.splice(index, 1);
      }
      continue;
    }
    // A conflict detected earlier in this batch remains blocked for the rest of the batch.
    if (pendingReview.some((entry) => entry.identity === identity && entry.reason === "CONFLICTING_NORM_VERSION")) {
      pendingReview.push({ path, identity, reason: "CONFLICTING_NORM_VERSION" });
      continue;
    }
    const staged = { relativePath: path, identity, sha256, record };
    seen.set(identity, staged);
    accepted.push(staged);
  }

  return { accepted, duplicatePaths, pendingReview, processed: files.length };
}
