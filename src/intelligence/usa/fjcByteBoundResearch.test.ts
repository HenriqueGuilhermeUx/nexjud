import { describe, expect, it } from "vitest"
import { buildUSByteBoundCivilResearch } from "./fjcByteBoundResearch"
import type { FJCCivilManifest } from "./fjcCivilCohort"
import type { USCivilResearchSelection } from "./fjcCivilResearchMemo"

const rows = [
  ...Array.from({ length: 35 }, (_, i) => ({
    CASE: "training-" + i, DISTRICT: "NYSD", NOS: "190",
    FILED: "2024-01-01", CLOSED: i < 12 ? "2024-02-01" : null,
  })),
  ...Array.from({ length: 35 }, (_, i) => ({
    CASE: "validation-" + i, DISTRICT: "NYSD", NOS: "190",
    FILED: "2025-02-01", CLOSED: i < 12 ? "2025-03-01" : null,
  })),
]
async function fixture(source = rows) {
  const bytes = new TextEncoder().encode(JSON.stringify(source))
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  const sha = Array.from(new Uint8Array(digest))
    .map(x => x.toString(16).padStart(2, "0")).join("")
  const manifest: FJCCivilManifest = {
    datasetId: "synthetic-fjc-civil",
    revision: "synthetic-reviewed-conversion-v1",
    releaseSha256: sha,
    sourceUrl: "https://www.fjc.gov/research/idb",
    codebookUrl: "https://www.fjc.gov/research/idb",
    asOfDate: "2026-09-30",
    codebookMappingReviewed: true,
    useRightsReviewed: true,
    fields: {
      recordId: "CASE", courtCode: "DISTRICT", natureOfSuit: "NOS",
      filedDate: "FILED", terminatedDate: "CLOSED",
    },
  }
  const expected: USCivilResearchSelection = {
    courtCode: "NYSD", natureOfSuit: "190", horizonDays: 180,
    sourceDatasetId: manifest.datasetId, sourceRevision: manifest.revision,
    sourceSha256: sha, snapshotAsOfDate: manifest.asOfDate,
    sourceAuditApproved: true,
  }
  return { bytes, manifest, expected }
}

describe("bitwise FJC descriptive source-to-report research chain: SYNTHETIC ONLY", () => {
  it("computes validation-cohort statistics only from expected bytes and pinned manifest", async () => {
    const f = await fixture()
    const out = await buildUSByteBoundCivilResearch(
      f.bytes, f.manifest, "2024-12-31", "2025-01-01", f.expected,
    )
    expect(out).toMatchObject({
      trainingCaseCount: 35, validationCaseCount: 35,
      sourceIntegrityChecked: true, expectedDigestMatched: true,
      sourceAuthenticityCertified: false,
      temporalReconstructionIsHistoricalSnapshot: false,
      modelTrained: false, individualCasePredictionAvailable: false,
    })
    expect(out.research).toMatchObject({
      status: "DESCRIPTIVE_ONLY", cohortSize: 35,
      observedTerminations: 12, rightCensored: 23,
      modelTrained: false, individualCaseForecastAvailable: false,
    })
    expect(out.research.estimatedNonterminationAtHorizon).toBeCloseTo(23/35, 12)
  })

  it("refuses any source substitution even when new JSON remains valid", async () => {
    const f = await fixture()
    const forgedBytes = new TextEncoder().encode(
      new TextDecoder().decode(f.bytes).replace("validation-1", "validation-x"),
    )
    await expect(buildUSByteBoundCivilResearch(
      forgedBytes, f.manifest, "2024-12-31", "2025-01-01", f.expected,
    )).rejects.toThrow(/SHA-256 mismatch/)
  })

  it("refuses a fake research pin even when the manifest and data agree with each other", async () => {
    const f = await fixture()
    for (const bad of [
      { sourceSha256: "e".repeat(64) },
      { sourceDatasetId: "swapped-synthetic-dataset" },
      { sourceRevision: "unreviewed-release" },
      { snapshotAsOfDate: "2026-08-31" },
      { sourceAuditApproved: false },
    ]) {
      await expect(buildUSByteBoundCivilResearch(
        f.bytes, f.manifest, "2024-12-31", "2025-01-01",
        { ...f.expected, ...bad },
      )).rejects.toThrow(/Unpinned or mismatched/)
    }
  })

  it("never borrows data across different courts or procedural classes", async () => {
    const withOtherCourt = rows.map((r, i) =>
      i >= 55 ? { ...r, DISTRICT: "CAND", NOS: "440" } : r)
    const f = await fixture(withOtherCourt)
    const out = await buildUSByteBoundCivilResearch(
      f.bytes, f.manifest, "2024-12-31", "2025-01-01", f.expected,
    )
    expect(out.validationCaseCount).toBe(35)
    expect(out.research.cohortSize).toBe(20)
    expect(out.research.status).toBe("INSUFFICIENT_EVIDENCE")
    expect(out.research.estimatedNonterminationAtHorizon).toBeNull()
  })

  it("rejects invalid dates, overlapping filing windows and future case dispositions", async () => {
    const f = await fixture()
    await expect(buildUSByteBoundCivilResearch(
      f.bytes, f.manifest, "2025-02-01", "2025-01-01", f.expected,
    )).rejects.toThrow(/must not overlap/)
    const altered = rows.map((r, i) => i === 36 ? { ...r, CLOSED: "2027-02-01" } : r)
    const future = await fixture(altered)
    await expect(buildUSByteBoundCivilResearch(
      future.bytes, future.manifest, "2024-12-31", "2025-01-01", future.expected,
    )).rejects.toThrow(/future termination date/)
  })
})
