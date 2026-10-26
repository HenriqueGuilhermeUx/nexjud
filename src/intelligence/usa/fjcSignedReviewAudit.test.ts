import { describe, expect, it } from "vitest"
import type { USFJCIndependentReleaseReviewPacket } from "./fjcSourceLineagePreflight"
import {
  buildUSFJCReviewSigningBytes, verifyUSFJCPinnedSignedReview,
  type USFJCSignedReviewRecord, type USFJCIndependentReviewRegistry,
  type USFJCReviewSignature, type USFJCReviewRole,
} from "./fjcSignedReviewAudit"

const roles=["source","mapping","rights"] as const
const enc=new TextEncoder()
const hex=(b: Uint8Array)=>Array.from(b).map(x=>x.toString(16).padStart(2,"0")).join("")
async function hash(b: Uint8Array) { return hex(new Uint8Array(await crypto.subtle.digest("SHA-256",b))) }

async function fixture() {
  const packet: USFJCIndependentReleaseReviewPacket = {
    datasetId:"synthetic-idb",revision:"revision-1",asOfDate:"2026-09-30",
    declaredPublisherReleaseUrl:"https://www.fjc.gov/research/idb",
    codebookUrl:"https://www.fjc.gov/research/idb",
    originalReleaseSha256:"1".repeat(64),convertedExtractSha256:"2".repeat(64),
    converterProcedureSha256:"3".repeat(64),codebookRevision:"synthetic-book-v1",
    originalCaptureEvidenceSha256:"4".repeat(64),
    fieldMappingReviewEvidenceSha256:"5".repeat(64),
    rightsReviewEvidenceSha256:"6".repeat(64),
    conversionOperatorId:"operator-a",sourceReviewerId:"auditor-source",
    mappingReviewerId:"auditor-mapping",rightsReviewerId:"auditor-rights",
    rightsDisposition:"OFFLINE_RESEARCH_REVIEWED",
    sourceObservedAt:"2026-10-24T12:00:00Z",
    reviewRecordedAt:"2026-10-25T12:00:00Z",
  }
  const record: USFJCSignedReviewRecord={
    sequence:7,previousDigest:"a".repeat(64),
    signedAt:"2026-10-25T13:00:00Z",signatures:[],
  }
  const keys: USFJCIndependentReviewRegistry["keys"][number][]=[]
  const keyPairs: CryptoKeyPair[]=[]
  for(let i=0;i<3;i++){
    const pair=await crypto.subtle.generateKey(
      {name:"ECDSA",namedCurve:"P-256"},true,["sign","verify"],
    )
    const spki=new Uint8Array(await crypto.subtle.exportKey("spki",pair.publicKey))
    keys.push({
      role:roles[i],reviewerId:["auditor-source","auditor-mapping","auditor-rights"][i],
      keyId:"synthetic-key-"+i,spkiBytes:spki,pinnedSpkiSha256:await hash(spki),
      activatedAt:"2026-10-01T00:00:00Z",expiresAt:"2026-11-01T00:00:00Z",
      revokedAt:null,
    })
    keyPairs.push(pair)
  }
  const signatures: USFJCReviewSignature[]=[]
  for(let i=0;i<3;i++){
    const unsigned={role:roles[i],reviewerId:keys[i].reviewerId,keyId:keys[i].keyId}
    const bytes=buildUSFJCReviewSigningBytes(packet,record,unsigned)
    const sig=new Uint8Array(await crypto.subtle.sign(
      {name:"ECDSA",hash:"SHA-256"},keyPairs[i].privateKey,bytes,
    ))
    signatures.push({...unsigned,signatureHex:hex(sig)})
  }
  record.signatures=signatures
  const registry: USFJCIndependentReviewRegistry={
    expectedSequence:7,expectedPreviousDigest:"a".repeat(64),keys,
  }
  return {packet,record,registry,keys,keyPairs}
}
const verify=(f: Awaited<ReturnType<typeof fixture>>,
  patch: Partial<USFJCSignedReviewRecord> = {},
  reg: USFJCIndependentReviewRegistry = f.registry,
  at="2026-10-25T14:00:00Z")=>
    verifyUSFJCPinnedSignedReview(f.packet,{...f.record,...patch},reg,at)

describe("signed FJC audit revision / trusted service reviewer keys — synthetic only",()=>{
  it("checks three independent pinned signatures and emits non-legal link fingerprint",async()=>{
    const f=await fixture()
    const a=await verify(f)
    const b=await verify(f)
    expect(a).toEqual(b)
    expect(a).toMatchObject({
      status:"THREE_PINNED_REVIEW_SIGNATURES_VERIFIED",
      rolesVerified:["source","mapping","rights"],registryLinkMatched:true,
      pinnedReviewerKeysVerified:true,
      reviewerRealWorldIdentityVerified:false,
      immutableLedgerPersistenceVerified:false,
      officialFJCReleaseAuthenticated:false,
      legalUseRightsCertified:false,
      caseOutcomePredictionApproved:false,
    })
    expect(a.linkedRecordDigest).toMatch(/^[0-9a-f]{64}$/)
    expect(JSON.stringify(a)).not.toContain("auditor-source")
  })
  it("blocks forged packet metadata even if all three signatures still match original bytes",async()=>{
    const f=await fixture()
    for(const packet of [
      {...f.packet,revision:"revision-2"},
      {...f.packet,rightsDisposition:"NOT_REVIEWED" as typeof f.packet.rightsDisposition},
      {...f.packet,sourceReviewerId:"other-reviewer"},
      {...f.packet,extraProperty:"legalValidityEstablished:true"},
    ]){
      await expect(verifyUSFJCPinnedSignedReview(
        packet,f.record,f.registry,"2026-10-25T14:00:00Z",
      )).rejects.toThrow(/signed review registry/)
    }
  })
  it("rejects tampering with previous checkpoint, position, signature or role ordering",async()=>{
    const f=await fixture()
    await expect(verify(f,{previousDigest:"b".repeat(64)})).rejects.toThrow(/signed review registry/)
    await expect(verify(f,{sequence:8})).rejects.toThrow(/signed review registry/)
    await expect(verify(f,{}, {...f.registry,expectedPreviousDigest:"b".repeat(64)}))
      .rejects.toThrow(/signed review registry/)
    await expect(verify(f,{}, {...f.registry,expectedSequence:8}))
      .rejects.toThrow(/signed review registry/)
    await expect(verify(f,{signatures:[f.record.signatures[1],f.record.signatures[0],f.record.signatures[2]]}))
      .rejects.toThrow(/signed review registry/)
    await expect(verify(f,{signatures:f.record.signatures.slice(0,2)}))
      .rejects.toThrow(/signed review registry/)
    await expect(verify(f,{
      signatures:f.record.signatures.map((s,i)=>i===1?
        {...s,signatureHex:"f".repeat(128)}:s),
    })).rejects.toThrow(/signed review registry/)
  })
  it("does not accept unpinned keys, duplicated reviewer IDs or key identifiers",async()=>{
    const f=await fixture()
    const changedSpki=new Uint8Array(f.keys[0].spkiBytes)
    changedSpki[changedSpki.length-1]^=1
    await expect(verify(f,{}, {...f.registry,keys:[
      {...f.keys[0],spkiBytes:changedSpki},f.keys[1],f.keys[2],
    ]})).rejects.toThrow(/signed review registry/)
    await expect(verify(f,{}, {...f.registry,keys:[
      {...f.keys[0],keyId:f.keys[1].keyId},f.keys[1],f.keys[2],
    ]})).rejects.toThrow(/signed review registry/)
    await expect(verify(f,{}, {...f.registry,keys:[
      {...f.keys[0],reviewerId:f.keys[1].reviewerId},f.keys[1],f.keys[2],
    ]})).rejects.toThrow(/signed review registry/)
  })
  it("refuses expired, revoked, future, or malformed key epochs and server clock",async()=>{
    const f=await fixture()
    for(const change of [
      {expiresAt:"2026-10-25T13:00:00Z"},
      {revokedAt:"2026-10-25T13:30:00Z"},
      {activatedAt:"2026-10-26T00:00:00Z"},
      {revokedAt:"2026-02-30T00:00:00Z"},
    ]){
      await expect(verify(f,{}, {...f.registry,keys:[
        {...f.keys[0],...change},f.keys[1],f.keys[2],
      ]})).rejects.toThrow(/signed review registry/)
    }
    await expect(verify(f,{},f.registry,"2026-10-24T00:00:00Z"))
      .rejects.toThrow(/signed review registry/)
    await expect(verify(f,{},f.registry,"2026-10-25T14:00:00+01:00"))
      .rejects.toThrow(/signed review registry/)
  })
  it("refuses signatures bound to other release revisions or signer key ids",async()=>{
    const f=await fixture()
    await expect(verify(f,{signedAt:"2026-10-25T13:01:00Z"}))
      .rejects.toThrow(/signed review registry/)
    await expect(verify(f,{signatures:f.record.signatures.map((s,i)=>i===0?
      {...s,keyId:"different-key"}:s)})).rejects.toThrow(/signed review registry/)
  })
})
