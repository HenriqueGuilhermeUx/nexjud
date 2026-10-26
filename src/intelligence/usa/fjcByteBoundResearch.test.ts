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
      sourceLineagePreflightStatus: "NOT_SUBMITTED",
      conversionReplayStatus: "NOT_RUN",
      temporalReconstructionIsHistoricalSnapshot: false,
      modelTrained: false, individualCasePredictionAvailable: false,
    })
    expect(out.research).toMatchObject({
      status: "DESCRIPTIVE_ONLY", cohortSize: 35,
      observedTerminations: 12, rightCensored: 23,
      modelTrained: false, individualCaseForecastAvailable: false,
    })
    expect(out.research.estimatedNonterminationAtHorizon).toBeCloseTo(23/35, 12)
    expect(out.fixedHorizonResearchBacktest).toMatchObject({
      status: "ABSTAIN_INSUFFICIENT_EVIDENCE",
      caseFeatureModelTrained: false,
      individualCaseForecastPermitted: false,
      prospectiveValidationComplete: false,
    })
    expect(out.fixedHorizonResearchBacktest.outOfTimeBrier).toBeNull()
    expect(out.multiGroupFeatureResearch).toMatchObject({
      status: "ABSTAIN_INSUFFICIENT_OR_UNSEEN_GROUP",
      fittedFeatureModel: false, individualForecastEnabled: false,
    })
  })

  it("binds declared external release review to EXACT original and converted bytes without certifying publisher", async () => {
    const f=await fixture()
    const upstream=new TextEncoder().encode("source:"+new TextDecoder().decode(f.bytes))
    const converterArtifact=new TextEncoder().encode("reviewed synthetic converter artifact")
    const rawHash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",upstream)))
      .map(x=>x.toString(16).padStart(2,"0")).join("")
    const converterHash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",converterArtifact)))
      .map(x=>x.toString(16).padStart(2,"0")).join("")
    const packet = {
      datasetId:f.manifest.datasetId,revision:f.manifest.revision,
      asOfDate:f.manifest.asOfDate,
      declaredPublisherReleaseUrl:f.manifest.sourceUrl,
      codebookUrl:f.manifest.codebookUrl,
      originalReleaseSha256:rawHash,convertedExtractSha256:f.manifest.releaseSha256,
      converterProcedureSha256:converterHash,codebookRevision:"synthetic-book-v1",
      originalCaptureEvidenceSha256:"2".repeat(64),
      fieldMappingReviewEvidenceSha256:"3".repeat(64),
      rightsReviewEvidenceSha256:"4".repeat(64),
      conversionOperatorId:"converter-operator",
      sourceReviewerId:"source-auditor",mappingReviewerId:"mapping-auditor",
      rightsReviewerId:"rights-auditor",
      rightsDisposition:"OFFLINE_RESEARCH_REVIEWED" as const,
      sourceObservedAt:"2026-10-24T12:00:00Z",
      reviewRecordedAt:"2026-10-25T12:00:00Z",
    }
    const args=[f.bytes,f.manifest,"2024-12-31","2025-01-01",f.expected] as const
    const ok=await buildUSByteBoundCivilResearch(...args,{
      originalReleaseBytes:upstream,independentReviewPacket:packet,
    })
    expect(ok.sourceLineagePreflightStatus).toBe("DECLARED_REVIEW_PACKET_HASHES_MATCH")
    expect(ok.conversionReplayStatus).toBe("NOT_RUN")
    let replayRuns=0
    const replayed=await buildUSByteBoundCivilResearch(...args,{
      originalReleaseBytes:upstream,independentReviewPacket:packet,
      conversionReplay:{
        reviewedConverterArtifactBytes:converterArtifact,
        replayConverter:async raw=>{
          replayRuns++
          const text=new TextDecoder("utf-8",{fatal:true}).decode(raw)
          if(!text.startsWith("source:")) throw new Error("Unrecognized test bytes")
          return new TextEncoder().encode(text.slice(7))
        },
      },
    })
    expect(replayRuns).toBe(2)
    expect(replayed.conversionReplayStatus).toBe("REPLAY_BYTE_IDENTICAL")
    expect(replayed.sourceAuthenticityCertified).toBe(false)
    expect(replayed.individualCasePredictionAvailable).toBe(false)
    await expect(buildUSByteBoundCivilResearch(...args,{
      originalReleaseBytes:upstream,independentReviewPacket:packet,
      conversionReplay:{
        reviewedConverterArtifactBytes:converterArtifact,
        replayConverter:async()=>new TextEncoder().encode('{"forged":true}'),
      },
    })).rejects.toThrow(/replay verification failed/)
    expect(ok.sourceAuthenticityCertified).toBe(false)
    expect(ok.individualCasePredictionAvailable).toBe(false)
    await expect(buildUSByteBoundCivilResearch(...args,{
      originalReleaseBytes:new TextEncoder().encode("tampered original"),
      independentReviewPacket:packet,
    })).rejects.toThrow(/lineage/)
    await expect(buildUSByteBoundCivilResearch(...args,{
      originalReleaseBytes:upstream,
      independentReviewPacket:{...packet,sourceReviewerId:packet.conversionOperatorId},
    })).rejects.toThrow(/lineage/)
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

  it("runs source-bound held-out backtest only when both periods have sufficient mature cases", async () => {
    const cases = [
      ...Array.from({length: 60}, (_, i) => ({
        CASE:"training-mature-"+i, DISTRICT:"NYSD", NOS:"190",
        FILED:"2024-01-01", CLOSED:i<20?"2024-02-01":null,
      })),
      ...Array.from({length: 60}, (_, i) => ({
        CASE:"validation-mature-"+i, DISTRICT:"NYSD", NOS:"190",
        FILED:"2025-02-01", CLOSED:i<30?"2025-03-01":null,
      })),
    ]
    const f=await fixture(cases)
    const out=await buildUSByteBoundCivilResearch(
      f.bytes, f.manifest, "2024-12-31", "2025-01-01",
      {...f.expected, horizonDays:90},
    )
    expect(out.fixedHorizonResearchBacktest.status).toBe("RESEARCH_BENCHMARK_ONLY")
    expect(out.fixedHorizonResearchBacktest.fittedHistoricalGroupRate).toBeCloseTo(1/3,10)
    expect(out.fixedHorizonResearchBacktest.outOfTimeBrier).toBeCloseTo(5/18,10)
    expect(out.fixedHorizonResearchBacktest.individualCaseForecastPermitted).toBe(false)
  })

  it("trains a deterministic feature model only through independently pinned source-byte chain", async () => {
    const syntheticRows: typeof rows = []
    for (const [prefix, filed, count, high, low] of [
      ["train", "2024-01-01", 40, 32, 8],
      ["holdout", "2025-01-01", 30, 24, 6],
    ] as const) {
      for (const district of ["NYSD", "CAND"]) for (const nos of ["190", "440"]) {
        const ended = district === "NYSD" ? high : low
        for (let i=0;i<count;i++) syntheticRows.push({
          CASE:prefix+"-"+district+"-"+nos+"-"+i, DISTRICT:district,
          NOS:nos, FILED:filed, CLOSED:i<ended ? "2024-02-01" : null,
        })
      }
    }
    // Validation rows cannot have a 2024 termination: keep all terminations
    // after their filing date while retaining the same label patterns.
    const corrected = syntheticRows.map(row => ({
      ...row, CLOSED:row.CLOSED
        ? row.FILED === "2025-01-01" ? "2025-02-01" : "2024-02-01"
        : null,
    }))
    const f=await fixture(corrected)
    const output=await buildUSByteBoundCivilResearch(
      f.bytes, f.manifest, "2024-12-31", "2025-01-01",
      { ...f.expected, horizonDays:90 },
    )
    expect(output.sourceIntegrityChecked).toBe(true)
    expect(output.multiGroupFeatureResearch.status).toBe("RESEARCH_FEATURE_MODEL")
    expect(output.multiGroupFeatureResearch.fittedFeatureModel).toBe(true)
    expect(output.multiGroupFeatureResearch.heldoutImprovementBrier).toBeGreaterThan(.05)
    expect(output.multiGroupFeatureResearch.realFJCSourceAuthenticated).toBe(false)
    expect(output.multiGroupFeatureResearch.individualForecastEnabled).toBe(false)
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
