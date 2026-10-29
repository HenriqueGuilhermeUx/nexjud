import { describe, expect, it } from "vitest"
import {
  normalizeFJCCivilExtract, summarizeFJCCivilExtract, type FJCCivilManifest,
} from "./fjcCivilCohort"

const manifest: FJCCivilManifest = {
  datasetId: "SYNTHETIC_FJC_CIVIL_FIXTURE",
  revision: "fixture-v1",
  releaseSha256: "a".repeat(64),
  sourceUrl: "https://www.fjc.gov/research/idb",
  codebookUrl: "https://www.fjc.gov/research/idb",
  asOfDate: "2026-09-30",
  codebookMappingReviewed: true,
  useRightsReviewed: true,
  fields: {
    recordId: "ID", courtCode: "COURT", natureOfSuit: "NOS",
    filedDate: "FILED", terminatedDate: "CLOSED",
  },
}
const completed = { ID: "c1", COURT: "nysd", NOS: "190", FILED: "2024-01-01", CLOSED: "2024-01-31" }
const pending = { ID: "c2", COURT: "nysd", NOS: "190", FILED: "2026-09-01", CLOSED: null }

describe("FJC codebook-reviewed civil cohort - synthetic only", () => {
  it("preserves a known termination versus pending right-censoring", () => {
    const data = normalizeFJCCivilExtract([completed, pending], manifest)
    expect(data[0]).toMatchObject({
      observedDays: 30, terminationObserved: 1,
      terminatedAt: "2024-01-31", predictiveOutcomeLabel: null,
    })
    expect(data[1]).toMatchObject({
      observedDays: 29, terminationObserved: 0, terminatedAt: null, predictiveOutcomeLabel: null,
    })
    expect(summarizeFJCCivilExtract(data)).toMatchObject({
      n: 2, observedTerminations: 1, rightCensored: 1,
      censoredFraction: 0.5, predictiveModelValidated: false,
    })
  })

  it("never equates missing termination with a successful or unsuccessful outcome", () => {
    const x = normalizeFJCCivilExtract([pending], manifest)[0]
    expect(x.terminationObserved).toBe(0)
    expect(x.predictiveOutcomeLabel).toBeNull()
  })

  it("refuses unreviewed manifests or untrusted dataset origins", () => {
    expect(() => normalizeFJCCivilExtract([completed], { ...manifest, codebookMappingReviewed: false as true })).toThrow()
    expect(() => normalizeFJCCivilExtract([completed], { ...manifest, useRightsReviewed: false as true })).toThrow()
    expect(() => normalizeFJCCivilExtract([completed], { ...manifest, sourceUrl: "https://fjc.gov.evil.example/idb" })).toThrow()
    expect(() => normalizeFJCCivilExtract([completed], { ...manifest, releaseSha256: "unknown" })).toThrow()
    expect(() => normalizeFJCCivilExtract([completed], {
      ...manifest, fields: { ...manifest.fields, filedDate: manifest.fields.terminatedDate },
    })).toThrow()
  })

  it("rejects impossible chronology, future outcomes and duplicate records", () => {
    const invalid = [
      { ...completed, FILED: "2026-10-01" },
      { ...completed, CLOSED: "2026-10-01" },
      { ...completed, CLOSED: "2023-12-31" },
      { ...completed, FILED: "2026-02-30" },
      { ...completed, CLOSED: "not-a-date" },
    ]
    for (const r of invalid) expect(() => normalizeFJCCivilExtract([r], manifest)).toThrow()
    expect(() => normalizeFJCCivilExtract([completed, completed], manifest)).toThrow()
  })

  it("permits a same-day termination without negative duration", () => {
    const x = normalizeFJCCivilExtract([
      { ...completed, FILED: "2026-09-30", CLOSED: "2026-09-30" },
    ], manifest)[0]
    expect(x.observedDays).toBe(0)
    expect(x.terminationObserved).toBe(1)
  })

  it("does not silently discard missing essential variables or allow huge batches", () => {
    expect(() => normalizeFJCCivilExtract([{ ...completed, COURT: null }], manifest)).toThrow()
    expect(() => normalizeFJCCivilExtract(Array(10001).fill(completed), manifest)).toThrow()
  })
})
