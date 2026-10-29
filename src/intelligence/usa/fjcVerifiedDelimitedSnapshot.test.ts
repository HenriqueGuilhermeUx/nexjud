import { describe, expect, it } from "vitest"
import { loadVerifiedFJCDelimitedSnapshot, type FJCDelimitedManifest } from "./fjcVerifiedDelimitedSnapshot"

const header = "CASE,COURT,NOS,FILED,CLOSED"
const rows = ["c1,NYSD,190,2024-01-01,2024-02-01", "c2,NYSD,190,2026-09-01,"]
const encode = (s: string) => new TextEncoder().encode(s)
async function manifestFor(text: string): Promise<{ bytes: Uint8Array, manifest: FJCDelimitedManifest }> {
  const bytes = encode(text)
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)))
    .map(x => x.toString(16).padStart(2, "0")).join("")
  return {
    bytes,
    manifest: {
      datasetId: "SYNTHETIC_FJC_CIVIL", revision: "synthetic-converter-v1",
      sourceUrl: "https://www.fjc.gov/research/idb",
      codebookUrl: "https://www.fjc.gov/research/idb",
      releaseSha256: hash,
      asOfDate: "2026-09-30",
      codebookMappingReviewed: true, useRightsReviewed: true,
      inputKind: "verified-converted-text", conversionFormatReviewed: true, delimiter: ",",
      fields: {
        recordId: "CASE", courtCode: "COURT", natureOfSuit: "NOS",
        filedDate: "FILED", terminatedDate: "CLOSED",
      },
    },
  }
}

describe("FJC codebook approved CSV conversion with exact digest", () => {
  it("parses two synthetic civil cases and never converts pending into terminated", async () => {
    const input = await manifestFor([header, ...rows].join("\r\n") + "\r\n")
    const x = await loadVerifiedFJCDelimitedSnapshot(input.bytes, input.manifest)
    expect(x).toMatchObject({ conversionVerified: true, officialOriginalVerified: false, modelTrained: false })
    expect(x.records).toHaveLength(2)
    expect(x.records[0]).toMatchObject({ recordId: "c1", terminationObserved: 1 })
    expect(x.records[1]).toMatchObject({ recordId: "c2", terminationObserved: 0, terminatedAt: null })
  })
  it("accepts codebook mapped TSV and escaped quoted fields", async () => {
    const text = "CASE\tCOURT\tNOS\tFILED\tCLOSED\n\"c\"\"1\"\tNYSD\t190\t2024-01-01\t2024-02-01"
    const x = await manifestFor(text)
    x.manifest.delimiter = "\t"
    const result = await loadVerifiedFJCDelimitedSnapshot(x.bytes, x.manifest)
    expect(result.records[0].recordId).toBe('c"1')
  })
  it("fails on changed conversion bytes with the original digest", async () => {
    const a = await manifestFor([header, ...rows].join("\n"))
    await expect(loadVerifiedFJCDelimitedSnapshot(encode([header, ...rows].reverse().join("\n")), a.manifest))
      .rejects.toThrow(/digest mismatch/)
  })
  it("requires reviewed conversion, codebook and correct field map", async () => {
    const x = await manifestFor([header, ...rows].join("\n"))
    await expect(loadVerifiedFJCDelimitedSnapshot(x.bytes, { ...x.manifest, conversionFormatReviewed: false as true })).rejects.toThrow()
    await expect(loadVerifiedFJCDelimitedSnapshot(x.bytes, { ...x.manifest, fields: { ...x.manifest.fields, recordId: "MISSING" } })).rejects.toThrow()
  })
  it.each([
    "CASE,COURT,NOS,FILED,FILED\nc1,NYSD,190,2024-01-01,2024-02-01",
    "CASE,COURT,NOS,FILED,CLOSED\nc1,NYSD,190,2024-01-01",
    "CASE,COURT,NOS,FILED,CLOSED\nc1,NYSD,190,2024-01-01,\n\n",
    'CASE,COURT,NOS,FILED,CLOSED\n"c1"x,NYSD,190,2024-01-01,',
    'CASE,COURT,NOS,FILED,CLOSED\n"c1,NYSD,190,2024-01-01,',
    "CASE,COURT,NOS,FILED,CLOSED\nc1,NYSD,190,2027-01-01,",
  ])("rejects malformed, ambiguous or chronologically impossible extracts", async data => {
    const x = await manifestFor(data)
    await expect(loadVerifiedFJCDelimitedSnapshot(x.bytes, x.manifest)).rejects.toThrow()
  })
  it("rejects malformed UTF-8 even when digest matches", async () => {
    const bytes = new Uint8Array([0xff, 0xfe])
    const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)))
      .map(x => x.toString(16).padStart(2, "0")).join("")
    const x = await manifestFor([header, ...rows].join("\n"))
    await expect(loadVerifiedFJCDelimitedSnapshot(bytes, { ...x.manifest, releaseSha256: digest })).rejects.toThrow()
  })
})
