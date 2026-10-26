import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { stageLegislationSourceBatch } from "./legislationBatchStaging";
import { createLegislationSearchIndex } from "./legislationSearchIndex";

const fixtureFile = process.env.NEXJUD_PINNED_LEGISLATION_FILE;

describe.skipIf(!fixtureFile)("real pinned ctresb/leis fixture (offline after download)", () => {
  it("parses a historical snapshot without inventing official verification", async () => {
    const markdown = readFileSync(fixtureFile!, "utf8");
    const result = await stageLegislationSourceBatch([{
      path: "federal/leis-ordinarias/2026/lei-15322-2026-01-06.md",
      markdown,
    }]);
    expect(result.pendingReview).toHaveLength(0);
    expect(result.accepted).toHaveLength(1);
    const staged = result.accepted[0];
    expect(staged.record.number).toBe("15322");
    expect(staged.record.date).toBe("2026-01-06");
    expect(staged.record.safeToCiteAsOfficial).toBe(false);
    expect(staged.sha256).toMatch(/^[a-f0-9]{64}$/);
    const index = createLegislationSearchIndex([staged]);
    expect(index.count).toBeGreaterThanOrEqual(3);
    const matches = index.search("animais domésticos");
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(matches.every((hit) => hit.safeToCiteAsOfficial === false)).toBe(true);
    expect(matches[0].sourceUrl).toMatch(/^https:\/\//);
  });
});
