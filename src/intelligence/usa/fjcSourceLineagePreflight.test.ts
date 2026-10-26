import { describe, expect, it } from "vitest"
import type { FJCCivilManifest } from "./fjcCivilCohort"
import type { USCivilResearchSelection } from "./fjcCivilResearchMemo"
import {
  preflightUSFJCIndependentReleaseLineage,
  type USFJCIndependentReleaseReviewPacket,
} from "./fjcSourceLineagePreflight"

const encoder = new TextEncoder()
const sha256 = async (bytes: Uint8Array): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2, "0")).join("")
}
async function fixture() {
  const raw = encoder.encode("SYNTHETIC upstream FJC stand-in; NOT an FJC release")
  const converted = encoder.encode('[{"CASE":"synthetic-001","DISTRICT":"NYSD"}]')
  const rawHash = await sha256(raw)
  const convertedHash = await sha256(converted)
  const manifest: FJCCivilManifest = {
    datasetId: "synthetic-release", revision: "rev-1",
    releaseSha256: convertedHash,
    sourceUrl: "https://www.fjc.gov/research/idb",
    codebookUrl: "https://www.fjc.gov/research/idb",
    asOfDate: "2026-09-30",
    codebookMappingReviewed: true, useRightsReviewed: true,
    fields: {
      recordId:"CASE", courtCode:"DISTRICT", natureOfSuit:"NOS",
      filedDate:"FILED", terminatedDate:"CLOSED",
    },
  }
  const selection: USCivilResearchSelection = {
    courtCode:"NYSD", natureOfSuit:"190", horizonDays:90,
    sourceDatasetId:manifest.datasetId, sourceRevision:manifest.revision,
    sourceSha256:convertedHash, snapshotAsOfDate:manifest.asOfDate,
    sourceAuditApproved:true,
  }
  const packet: USFJCIndependentReleaseReviewPacket = {
    datasetId:manifest.datasetId, revision:manifest.revision,
    asOfDate:manifest.asOfDate,
    declaredPublisherReleaseUrl:manifest.sourceUrl,
    codebookUrl:manifest.codebookUrl,
    originalReleaseSha256:rawHash, convertedExtractSha256:convertedHash,
    converterProcedureSha256:"1".repeat(64), codebookRevision:"synthetic-book-1",
    originalCaptureEvidenceSha256:"2".repeat(64),
    fieldMappingReviewEvidenceSha256:"3".repeat(64),
    rightsReviewEvidenceSha256:"4".repeat(64),
    conversionOperatorId:"operator-1",
    sourceReviewerId:"source-auditor-1",
    mappingReviewerId:"mapping-auditor-2",
    rightsReviewerId:"rights-auditor-3",
    rightsDisposition:"OFFLINE_RESEARCH_REVIEWED",
    sourceObservedAt:"2026-10-24T13:00:00Z",
    reviewRecordedAt:"2026-10-25T14:00:00Z",
  }
  return {raw,converted,manifest,selection,packet}
}
describe("US FJC offline original-to-converted release lineage: synthetic only", () => {
  it("cross-binds source and conversion hashes but explicitly refuses publisher certification", async () => {
    const f = await fixture()
    const report = await preflightUSFJCIndependentReleaseLineage(
      f.raw,f.converted,f.manifest,f.selection,f.packet,
    )
    expect(report).toMatchObject({
      status:"DECLARED_REVIEW_PACKET_HASHES_MATCH",
      sourceBytesMatchedPinnedDigest:true,
      convertedBytesMatchedPinnedDigest:true,
      reviewerIdsStructurallyDistinct:true,
      publisherReleaseAuthenticated:false,
      independentReviewerIdentityCryptographicallyVerified:false,
      conversionProcedureReproduced:false,
      researchUseRightsLegallyCertified:false,
      genuineHistoricalSnapshotVerified:false,
      legalPredictionApproved:false,
    })
    expect(JSON.stringify(report)).not.toContain("operator-1")
  })
  it("rejects changed original bytes and substituted conversion bytes", async () => {
    const f = await fixture()
    await expect(preflightUSFJCIndependentReleaseLineage(
      encoder.encode("SYNTHETIC changed upstream"),f.converted,f.manifest,f.selection,f.packet,
    )).rejects.toThrow(/lineage/)
    await expect(preflightUSFJCIndependentReleaseLineage(
      f.raw,encoder.encode('{"forged":true}'),f.manifest,f.selection,f.packet,
    )).rejects.toThrow(/lineage/)
  })
  it("rejects manifest/selection mismatches even if reviewed digests are intact", async () => {
    const f=await fixture()
    const variants: Array<{manifest: FJCCivilManifest; selection: USCivilResearchSelection}> = [
      {manifest:{...f.manifest,revision:"changed"},selection:f.selection},
      {manifest:f.manifest,selection:{...f.selection,sourceDatasetId:"replaced"}},
      {manifest:{...f.manifest,releaseSha256:"a".repeat(64)},selection:f.selection},
      {manifest:f.manifest,selection:{...f.selection,snapshotAsOfDate:"2026-01-01"}},
      {manifest:f.manifest,selection:{...f.selection,sourceAuditApproved:false}},
      {manifest:{...f.manifest,useRightsReviewed:false as unknown as true},selection:f.selection},
    ]
    for(const v of variants) {
      await expect(preflightUSFJCIndependentReleaseLineage(
        f.raw,f.converted,v.manifest,v.selection,f.packet,
      )).rejects.toThrow(/lineage/)
    }
  })
  it("rejects misleading provider domains, unreviewed rights and incomplete reviewer separation", async () => {
    const f=await fixture()
    const bad: Array<Partial<USFJCIndependentReleaseReviewPacket>> = [
      {declaredPublisherReleaseUrl:"https://fjc.gov.evil.example/idb"},
      {declaredPublisherReleaseUrl:"https://fjc.gov@evil.example/idb"},
      {declaredPublisherReleaseUrl:"http://www.fjc.gov/research/idb"},
      {declaredPublisherReleaseUrl:"https://www.fjc.gov/research/idb?alternate=1"},
      {codebookUrl:"https://www.fjc.gov.evil.example/codebook"},
      {sourceReviewerId:"operator-1"},
      {mappingReviewerId:"source-auditor-1"},
      {rightsReviewerId:""},
      {rightsReviewEvidenceSha256:f.packet.originalCaptureEvidenceSha256},
      {rightsDisposition:"REJECTED" as USFJCIndependentReleaseReviewPacket["rightsDisposition"]},
      {sourceObservedAt:"2026-10-26T00:00:00Z"},
      {reviewRecordedAt:"2026-10-23T00:00:00Z"},
      {sourceObservedAt:"2026-10-24T13:00:00+01:00"},
      {originalReleaseSha256:"e".repeat(64)},
      {convertedExtractSha256:"f".repeat(64)},
      {converterProcedureSha256:"garbage"},
    ]
    for(const patch of bad) {
      await expect(preflightUSFJCIndependentReleaseLineage(
        f.raw,f.converted,f.manifest,f.selection,{...f.packet,...patch},
      )).rejects.toThrow(/lineage/)
    }
  })
  it("rejects missing bytes and forged timestamps rather than granting partial passes", async () => {
    const f=await fixture()
    await expect(preflightUSFJCIndependentReleaseLineage(
      new Uint8Array(),f.converted,f.manifest,f.selection,f.packet,
    )).rejects.toThrow(/lineage/)
    await expect(preflightUSFJCIndependentReleaseLineage(
      f.raw,new Uint8Array(),f.manifest,f.selection,f.packet,
    )).rejects.toThrow(/lineage/)
    await expect(preflightUSFJCIndependentReleaseLineage(
      f.raw,f.converted,f.manifest,f.selection,
      {...f.packet,reviewRecordedAt:"2026-02-30T00:00:00Z"},
    )).rejects.toThrow(/lineage/)
  })
})
