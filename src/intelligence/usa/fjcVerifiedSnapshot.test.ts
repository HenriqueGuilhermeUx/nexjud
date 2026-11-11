import { describe, expect, it } from "vitest"
import { loadVerifiedFJCJsonSnapshot } from "./fjcVerifiedSnapshot"
import type { FJCCivilManifest } from "./fjcCivilCohort"

const rows = [
  { CASE: "synthetic-a", DISTRICT: "NYSD", NOS: "190", FILED: "2024-01-01", CLOSED: "2024-02-01" },
  { CASE: "synthetic-b", DISTRICT: "NYSD", NOS: "190", FILED: "2026-09-01", CLOSED: null },
]
const encoded = (data: unknown) => new TextEncoder().encode(JSON.stringify(data))
async function digest(bytes: Uint8Array) {
  const hash = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(hash)).map(x => x.toString(16).padStart(2, "0")).join("")
}
async function fixture(data: unknown = rows) {
  const bytes = encoded(data)
  const manifest: FJCCivilManifest = {
    datasetId: "SYNTHETIC_FJC_JSON_FIXTURE",
    revision: "offline-v1",
    releaseSha256: await digest(bytes),
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
  return { bytes, manifest }
}

describe("FJC verified offline snapshot ingestion", () => {
  it("verifies exactly the parsed bytes and preserves right-censored pending cases", async () => {
    const { bytes, manifest } = await fixture()
    const result = await loadVerifiedFJCJsonSnapshot(bytes, manifest)
    expect(result).toMatchObject({
      sourceSha256: manifest.releaseSha256,
      sourceIntegrityChecked: true, sourceAuthenticityCertified: false, modelTrained: false,
    })
    expect(result.records.map(r => r.terminationObserved)).toEqual([1, 0])
    expect(result.records.every(r => r.predictiveOutcomeLabel === null)).toBe(true)
  })

  it("rejects altered bytes even when JSON remains syntactically valid", async () => {
    const original = await fixture()
    const substituted = encoded([...rows].reverse())
    await expect(loadVerifiedFJCJsonSnapshot(substituted, original.manifest))
      .rejects.toThrow(/SHA-256 mismatch/)
  })

  it("rejects forged/reused manifest checksums, corrupted JSON, invalid schema", async () => {
    const f = await fixture()
    await expect(loadVerifiedFJCJsonSnapshot(f.bytes, {
      ...f.manifest, releaseSha256: "f".repeat(64),
    })).rejects.toThrow(/SHA-256 mismatch/)
    const broken = await fixture({ unexpected: "object" })
    await expect(loadVerifiedFJCJsonSnapshot(broken.bytes, broken.manifest))
      .rejects.toThrow(/JSON row array/)
    const corrupt = new TextEncoder().encode("{not json")
    await expect(loadVerifiedFJCJsonSnapshot(corrupt, {
      ...f.manifest, releaseSha256: await digest(corrupt),
    })).rejects.toThrow(/Invalid FJC converted JSON/)
  })

  it("rejects future dispositions even with an intact snapshot digest", async () => {
    const altered = await fixture([{ ...rows[0], CLOSED: "2027-01-01" }])
    await expect(loadVerifiedFJCJsonSnapshot(altered.bytes, altered.manifest)).rejects.toThrow()
  })

  it("rejects malformed UTF-8 with a valid digest", async () => {
    const f = await fixture()
    const invalid = new Uint8Array([0xff, 0xfe])
    await expect(loadVerifiedFJCJsonSnapshot(invalid, {
      ...f.manifest, releaseSha256: await digest(invalid),
    })).rejects.toThrow()
  })
})
