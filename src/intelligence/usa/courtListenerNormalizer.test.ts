import { describe, expect, it } from "vitest"
import { normalizeCourtListenerOpinion, normalizeCourtListenerResults } from "./courtListenerNormalizer"

const collectedAt = "2026-10-24T16:00:00Z"
const sample = {
  cluster_id: 6613686,
  caseName: "Foo v. Foo",
  court: "Hawaii Intermediate Court of Appeals",
  court_id: "hawapp",
  dateFiled: "2003-01-10",
  docketNumber: "24158",
  absolute_url: "/opinion/6613686/foo-v-foo/",
  citation: ["101 Haw. 235", "65 P.3d 182"],
  opinions: [{ id: 6489975, type: "lead-opinion", snippet: "Affirmed in part" }],
}

describe("NexJud USA: CourtListener search evidence", () => {
  it("maps cited source metadata without asserting an outcome or prediction", () => {
    const record = normalizeCourtListenerOpinion(sample, collectedAt)
    expect(record).toMatchObject({
      source: "courtlistener",
      jurisdiction: "US",
      sourceRecordId: "6613686",
      courtId: "hawapp",
      decidedAt: "2003-01-10",
      opinionIds: [6489975],
      observedOutcome: null,
      outcomeVerified: false,
      predictionEligible: false,
    })
    expect(record?.sourceUrl).toBe("https://www.courtlistener.com/opinion/6613686/foo-v-foo/")
  })

  it("does not turn a search snippet into a judicial outcome", () => {
    const record = normalizeCourtListenerOpinion({
      ...sample, opinions: [{ id: 6489975, snippet: "Motion granted" }],
    }, collectedAt)
    expect(record?.observedOutcome).toBeNull()
    expect(record?.predictionEligible).toBe(false)
  })

  it("rejects invalid or untraceable records", () => {
    expect(normalizeCourtListenerOpinion({ ...sample, cluster_id: undefined }, collectedAt)).toBeNull()
    expect(normalizeCourtListenerOpinion({ ...sample, court: "" }, collectedAt)).toBeNull()
  })

  it("rejects external/non-opinion URLs and deduplicates source records", () => {
    const records = normalizeCourtListenerResults([
      { ...sample, absolute_url: "https://evil.example/steal" }, sample,
      { ...sample, cluster_id: 6613687 },
    ], collectedAt)
    expect(records).toHaveLength(2)
    expect(records[0].sourceUrl).toBeUndefined()
    expect(records[1].sourceRecordId).toBe("6613687")
  })

  it("rejects impossible opinion dates and collection instants", () => {
    const bad = normalizeCourtListenerOpinion({ ...sample, dateFiled: "2026-02-30" }, collectedAt)
    expect(bad?.decidedAt).toBeUndefined()
    expect(normalizeCourtListenerOpinion(sample, "2026-02-30T16:00:00Z")).toBeNull()
    expect(normalizeCourtListenerOpinion(sample, "2026-10-24")).toBeNull()
  })

  it("rejects HTML/control characters and clipped legal labels rather than trusting them", () => {
    expect(normalizeCourtListenerOpinion({ ...sample, caseName: "<script>alert(1)</script>" }, collectedAt)).toBeNull()
    expect(normalizeCourtListenerOpinion({ ...sample, court: "Court\nInjected" }, collectedAt)).toBeNull()
    expect(normalizeCourtListenerOpinion({ ...sample, caseName: "A".repeat(501) }, collectedAt)).toBeNull()
    const cited = normalizeCourtListenerOpinion({ ...sample, citation: ["A\nB", "101 Haw. 235"] }, collectedAt)
    expect(cited?.citation).toEqual(["101 Haw. 235"])
  })

  it("rejects mismatched opinion IDs, traversal, query and suspicious encoded URLs", () => {
    for (const url of [
      "/opinion/9999999/someone-else/",
      "/opinion/6613686/../other/",
      "/opinion/6613686/hello/?token=secret",
      "/opinion/6613686/foo%2fbar/",
      "/opinion/6613686/hello/#frag",
    ]) {
      const record = normalizeCourtListenerOpinion({ ...sample, absolute_url: url }, collectedAt)
      expect(record?.sourceUrl).toBeUndefined()
      expect(record?.predictionEligible).toBe(false)
    }
  })

})
