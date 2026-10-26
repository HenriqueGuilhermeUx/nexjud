import { describe, expect, it } from "vitest"
import { buildUSUnverifiedCitationDossier } from "./caseLawCitationDossier"
import type { USAOpinionEvidence } from "./courtListenerNormalizer"

const hit: USAOpinionEvidence = {
  source: "courtlistener", jurisdiction: "US",
  sourceRecordId: "1234", caseName: "Synthetic Case v. Example",
  court: "United States Court", courtId: "test",
  decidedAt: "2026-01-15", docketNumber: "1:26-cv-00001",
  citation: ["100 F.4th 22"], opinionIds: [5678],
  sourceUrl: "https://www.courtlistener.com/opinion/1234/synthetic-case/",
  collectedAt: "2026-10-25T22:00:00Z",
  observedOutcome: null, outcomeVerified: false, predictionEligible: false,
}

describe("NexJud USA discovery-only CourtListener citation dossier", () => {
  it("preserves source links but refuses to certify precedential status or predicted outcomes", () => {
    const dossier = buildUSUnverifiedCitationDossier([hit])
    expect(dossier.cards).toHaveLength(1)
    expect(dossier.cards[0]).toMatchObject({
      evidenceId: "1234", citation: ["100 F.4th 22"],
      officialOpinionUrl: hit.sourceUrl,
      hasVerifiedOpinionText: false,
      subsequentTreatmentChecked: false,
      bindingAuthorityDetermined: false,
      legalOutcomeVerified: false,
    })
    expect(dossier.citationValidityConfirmed).toBe(false)
    expect(dossier.legalAdviceOrOutcomePrediction).toBe(false)
  })

  it("deduplicates repeated cluster IDs and rejects unsafe source links", () => {
    const duplicate = buildUSUnverifiedCitationDossier([hit, hit])
    expect(duplicate.recordCount).toBe(1)
    expect(duplicate.ignoredUnsafeOrDuplicated).toBe(1)
    for (const sourceUrl of [
      "https://www.courtlistener.com.evil.invalid/opinion/1234/",
      "https://www.courtlistener.com/opinion/1234/?token=abc",
      "http://www.courtlistener.com/opinion/1234/",
      "https://www.courtlistener.com/not-an-opinion/1234/",
      "https://www.courtlistener.com/opinion/1234/#frag",
    ]) {
      expect(buildUSUnverifiedCitationDossier([{ ...hit, sourceUrl }]).cards[0].officialOpinionUrl).toBeNull()
    }
  })

  it("refuses invalid dates and fabricated outcome verification flags", () => {
    expect(() => buildUSUnverifiedCitationDossier([{ ...hit, decidedAt: "2026-02-30" }])).toThrow()
    expect(() => buildUSUnverifiedCitationDossier([{ ...hit, outcomeVerified: true }])).toThrow()
    expect(() => buildUSUnverifiedCitationDossier([{ ...hit, predictionEligible: true }])).toThrow()
    expect(() => buildUSUnverifiedCitationDossier([{ ...hit, observedOutcome: "win" as never }])).toThrow()
  })

  it("does not embed HTML in returned legal research labels", () => {
    expect(() => buildUSUnverifiedCitationDossier([{ ...hit, caseName: "<img onerror=alert(1)>" }])).toThrow()
    expect(() => buildUSUnverifiedCitationDossier([{ ...hit, citation: ["\nscript"] }])).toThrow()
  })
})
