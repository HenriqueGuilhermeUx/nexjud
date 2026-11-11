import { describe, expect, it } from "vitest"
import { verifyUSFJCByteIdenticalConversionReplay } from "./fjcConversionReplay"
import type { USFJCIndependentReleaseReviewPacket } from "./fjcSourceLineagePreflight"

const enc = new TextEncoder()
const hex = async (bytes: Uint8Array) => Array.from(
  new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),
).map(x=>x.toString(16).padStart(2,"0")).join("")

async function fixture() {
  const raw=enc.encode("source:SYNTHETIC")
  const converted=enc.encode('{"v":"SYNTHETIC"}')
  const artifact=enc.encode("reviewed standalone converter artifact: synthetic only")
  const packet: USFJCIndependentReleaseReviewPacket = {
    datasetId:"synthetic-idb",revision:"test-v1",asOfDate:"2026-09-30",
    declaredPublisherReleaseUrl:"https://www.fjc.gov/research/idb",
    codebookUrl:"https://www.fjc.gov/research/idb",
    originalReleaseSha256:await hex(raw),
    convertedExtractSha256:await hex(converted),
    converterProcedureSha256:await hex(artifact),
    codebookRevision:"synthetic-book-v1",
    originalCaptureEvidenceSha256:"1".repeat(64),
    fieldMappingReviewEvidenceSha256:"2".repeat(64),
    rightsReviewEvidenceSha256:"3".repeat(64),
    conversionOperatorId:"converter-1", sourceReviewerId:"reviewer-1",
    mappingReviewerId:"reviewer-2", rightsReviewerId:"reviewer-3",
    rightsDisposition:"OFFLINE_RESEARCH_REVIEWED",
    sourceObservedAt:"2026-10-24T01:00:00Z",
    reviewRecordedAt:"2026-10-25T01:00:00Z",
  }
  const reproducible = async (input: Uint8Array) => {
    const text=new TextDecoder("utf-8",{fatal:true}).decode(input)
    if(!text.startsWith("source:")) throw new Error("Invalid upstream")
    return enc.encode(JSON.stringify({v:text.slice(7)}))
  }
  return {raw,converted,artifact,packet,reproducible}
}

describe("FJC frozen converter replay: SYNTHETIC, no publisher attestation", () => {
  it("re-runs a trusted adapter twice over fresh byte copies",async()=>{
    const f=await fixture()
    let invoked=0
    const out=await verifyUSFJCByteIdenticalConversionReplay(
      f.raw,f.converted,f.packet,{
        reviewedConverterArtifactBytes:f.artifact,
        replayConverter:async bytes=>{invoked++;return f.reproducible(bytes)},
      },
    )
    expect(invoked).toBe(2)
    expect(out).toMatchObject({
      status:"REPLAY_BYTE_IDENTICAL",
      converterArtifactDigestMatchesReviewPacket:true,
      twoFreshReplayOutputsByteIdentical:true,
      originalInputCopiesUnchanged:true,
      executedConverterArtifactAttested:false,
      publisherReleaseAuthenticated:false,
      legalUseRightsCertified:false,
      independentHistoricalSnapshotVerified:false,
      legalCaseOutcomePredictionApproved:false,
    })
    expect(JSON.stringify(out)).not.toContain("SYNTHETIC")
  })
  it("rejects a converter artifact not matching independent pinned procedure bytes",async()=>{
    const f=await fixture()
    let invoked=0
    await expect(verifyUSFJCByteIdenticalConversionReplay(
      f.raw,f.converted,f.packet,{
        reviewedConverterArtifactBytes:enc.encode("substituted implementation"),
        replayConverter:async bytes=>{invoked++;return f.reproducible(bytes)},
      },
    )).rejects.toThrow(/replay verification failed/)
    expect(invoked).toBe(0)
  })
  it("rejects an altered original or expected converted file before executing",async()=>{
    const f=await fixture()
    for(const [raw,converted] of [
      [enc.encode("source:EVIL"),f.converted],
      [f.raw,enc.encode('{"v":"EVIL"}')],
    ]){
      await expect(verifyUSFJCByteIdenticalConversionReplay(
        raw,converted,f.packet,{
          reviewedConverterArtifactBytes:f.artifact,replayConverter:f.reproducible,
        },
      )).rejects.toThrow(/replay verification failed/)
    }
  })
  it("rejects a nondeterministic second run even when the first one matched",async()=>{
    const f=await fixture()
    let count=0
    await expect(verifyUSFJCByteIdenticalConversionReplay(
      f.raw,f.converted,f.packet,{
        reviewedConverterArtifactBytes:f.artifact,
        replayConverter:async bytes=>{
          count++
          return count===2 ? enc.encode('{"v":"different"}') : f.reproducible(bytes)
        },
      },
    )).rejects.toThrow(/replay verification failed/)
    expect(count).toBe(2)
  })
  it("rejects in-place mutation of the runner's input copy",async()=>{
    const f=await fixture()
    await expect(verifyUSFJCByteIdenticalConversionReplay(
      f.raw,f.converted,f.packet,{
        reviewedConverterArtifactBytes:f.artifact,
        replayConverter:async bytes=>{const output=await f.reproducible(bytes);bytes[0]=0;return output},
      },
    )).rejects.toThrow(/replay verification failed/)
  })
  it("rejects alteration of the caller-owned source by a malicious callback",async()=>{
    const f=await fixture()
    await expect(verifyUSFJCByteIdenticalConversionReplay(
      f.raw,f.converted,f.packet,{
        reviewedConverterArtifactBytes:f.artifact,
        replayConverter:async bytes=>{const output=await f.reproducible(bytes);f.raw[0]=0;return output},
      },
    )).rejects.toThrow(/replay verification failed/)
  })
  it("rejects mutation of the reviewed converter artifact during conversion",async()=>{
    const f=await fixture()
    await expect(verifyUSFJCByteIdenticalConversionReplay(
      f.raw,f.converted,f.packet,{
        reviewedConverterArtifactBytes:f.artifact,
        replayConverter:async bytes=>{
          const out=await f.reproducible(bytes)
          f.artifact[0]=0
          return out
        },
      },
    )).rejects.toThrow(/replay verification failed/)
  })
  it("rejects mutation of the pinned procedure digest during conversion",async()=>{
    const f=await fixture()
    await expect(verifyUSFJCByteIdenticalConversionReplay(
      f.raw,f.converted,f.packet,{
        reviewedConverterArtifactBytes:f.artifact,
        replayConverter:async bytes=>{
          const out=await f.reproducible(bytes)
          f.packet.converterProcedureSha256="a".repeat(64)
          return out
        },
      },
    )).rejects.toThrow(/replay verification failed/)
  })
  it("rejects converter exceptions, no bytes, or overlarge artifacts",async()=>{
    const f=await fixture()
    await expect(verifyUSFJCByteIdenticalConversionReplay(
      f.raw,f.converted,f.packet,{
        reviewedConverterArtifactBytes:f.artifact,
        replayConverter:async()=>{throw new Error("secret failure")},
      },
    )).rejects.toThrow(/replay verification failed/)
    await expect(verifyUSFJCByteIdenticalConversionReplay(
      f.raw,f.converted,f.packet,{
        reviewedConverterArtifactBytes:f.artifact,
        replayConverter:async()=>new Uint8Array(),
      },
    )).rejects.toThrow(/replay verification failed/)
    await expect(verifyUSFJCByteIdenticalConversionReplay(
      f.raw,f.converted,f.packet,{
        reviewedConverterArtifactBytes:new Uint8Array(8_000_001),
        replayConverter:f.reproducible,
      },
    )).rejects.toThrow(/replay verification failed/)
  })
})
