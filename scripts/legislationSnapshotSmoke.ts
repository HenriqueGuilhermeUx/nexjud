import { readFile, writeFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { stageLegislationSourceBatch } from "../src/enterprise/legislationBatchStaging";
import { verifyLegislationStagedSource } from "../src/enterprise/legislationSourceIntegrity";
import {
  exportLegislationDraftSnapshot, importLegislationDraftSnapshot,
} from "../src/enterprise/legislationSnapshot";

async function main() {
  if (process.env.GITHUB_ACTIONS !== "true" || process.argv.length !== 4)
    throw new Error("LEGAL_SNAPSHOT_SMOKE_CI_ONLY");
  const source = resolve(process.argv[2]);
  const destination = resolve(process.argv[3]);
  if (basename(source) !== "lei_15322.md" ||
      basename(destination) !== "legislation-draft.json" ||
      !destination.startsWith(resolve(process.env.RUNNER_TEMP || "/unconfigured") + "/"))
    throw new Error("LEGAL_SNAPSHOT_SMOKE_INVALID_PATH");
  const markdown = await readFile(source, "utf8");
  const result = await stageLegislationSourceBatch([{
    path: "federal/leis-ordinarias/2026/lei-15322-2026-01-06.md",
    markdown,
  }]);
  if (result.accepted.length !== 1 || result.pendingReview.length)
    throw new Error("LEGAL_SNAPSHOT_SMOKE_INVALID_SOURCE");
  const verified = await verifyLegislationStagedSource(result.accepted[0], markdown);
  if (!verified.originalSourceContentVerified || verified.safeToCiteAsOfficial !== false)
    throw new Error("LEGAL_SNAPSHOT_SMOKE_SOURCE_INTEGRITY_FAILED");
  const json = await exportLegislationDraftSnapshot(result.accepted);
  const loaded = await importLegislationDraftSnapshot(json);
  const hits = loaded.index.search("animais domésticos", 5);
  if (!hits.length || hits.some((hit) =>
    hit.safeToCiteAsOfficial !== false ||
    hit.verifiedAgainstOfficialSource !== false))
    throw new Error("LEGAL_SNAPSHOT_SMOKE_NOT_SOURCE_ONLY");
  await writeFile(destination, json, { mode: 0o600 });
  process.stdout.write(JSON.stringify({
    snapshot: basename(destination), bytes: Buffer.byteLength(json),
    checksum: loaded.checksum, articles: loaded.index.count,
    matchingArticles: hits.length, officialValidation: false,
  }) + "\n");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
