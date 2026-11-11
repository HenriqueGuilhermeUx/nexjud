import { describe, expect, it } from "vitest"
import { normalizeFJCCivilExtract, type FJCCivilManifest } from "./fjcCivilCohort"
import { splitFJCCivilCohortByFiling } from "./fjcTemporalSplit"

const m: FJCCivilManifest = {
  datasetId: "synthetic", revision: "v1", releaseSha256: "a".repeat(64),
  sourceUrl: "https://www.fjc.gov/research/idb",
  codebookUrl: "https://www.fjc.gov/research/idb",
  asOfDate: "2026-09-30", codebookMappingReviewed: true, useRightsReviewed: true,
  fields: { recordId: "id", courtCode: "court", natureOfSuit: "nos", filedDate: "filed", terminatedDate: "closed" },
}
const fixture = [
  { id: "training-future-end", court: "NYSD", nos: "190", filed: "2024-01-01", closed: "2025-03-01" },
  { id: "training-past-end", court: "NYSD", nos: "190", filed: "2024-07-01", closed: "2024-07-31" },
  { id: "validation-end", court: "NYSD", nos: "190", filed: "2025-04-01", closed: "2025-04-21" },
  { id: "validation-pending", court: "NYSD", nos: "190", filed: "2025-05-01", closed: null },
  { id: "gap", court: "NYSD", nos: "190", filed: "2025-02-01", closed: null },
]

describe("FJC time-aware cohort partition (synthetic)", () => {
  it("censors a later-known training termination at the actual training cutoff", () => {
    const normalized = normalizeFJCCivilExtract(fixture, m)
    const split = splitFJCCivilCohortByFiling(normalized, "2024-12-31", "2025-03-01")
    expect(split).toMatchObject({
      excludedGapCases: 1, predictiveModelValidated: false,
      trainingAsOfDate: "2024-12-31", validationAsOfDate: "2026-09-30",
    })
    expect(split.training).toHaveLength(2)
    expect(split.validation).toHaveLength(2)
    const future = split.training.find(x => x.caseId === "training-future-end")!
    expect(future).toMatchObject({ terminationObserved: 0, observedDays: 365 })
    const prior = split.training.find(x => x.caseId === "training-past-end")!
    expect(prior).toMatchObject({ terminationObserved: 1, observedDays: 30 })
    expect(split.validation.find(x => x.caseId === "validation-end")).toMatchObject({
      terminationObserved: 1, observedDays: 20,
    })
    expect(split.validation.find(x => x.caseId === "validation-pending")?.terminationObserved).toBe(0)
    expect(new Set([...split.training, ...split.validation].map(x => x.caseId)).size).toBe(4)
  })

  it("rejects inverted/overlapping windows and future validation starts", () => {
    const data = normalizeFJCCivilExtract(fixture, m)
    expect(() => splitFJCCivilCohortByFiling(data, "2025-03-01", "2025-03-01")).toThrow()
    expect(() => splitFJCCivilCohortByFiling(data, "2026-10-01", "2026-11-01")).toThrow()
    expect(() => splitFJCCivilCohortByFiling(data, "2026-02-30", "2026-03-01")).toThrow()
  })

  it("rejects source duplicates, revision mixing and contradictory event flags", () => {
    const data = normalizeFJCCivilExtract(fixture, m)
    expect(() => splitFJCCivilCohortByFiling([...data, data[0]], "2024-12-31", "2025-03-01")).toThrow()
    expect(() => splitFJCCivilCohortByFiling([
      ...data, { ...data[0], recordId: "different", revision: "v2" },
    ], "2024-12-31", "2025-03-01")).toThrow()
    expect(() => splitFJCCivilCohortByFiling([
      { ...data[0], terminationObserved: 0 },
    ], "2024-12-31", "2025-03-01")).toThrow()
  })
})
