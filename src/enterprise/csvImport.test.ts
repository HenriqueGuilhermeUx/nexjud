import { describe, expect, it } from "vitest"
import { MAX_IMPORT_BYTES, MAX_IMPORT_ITEMS, parseEnterpriseCsv } from "./csvImport"

const header = "externalId,sourceSystem,cnjDigits"
const row = "case-1,crm,00000000002026826000"
describe("enterprise CSV import for web and mobile PWA", () => {
  it("parses a well-formed lot and normalizes CNJ punctuation", () => {
    const result = parseEnterpriseCsv("\uFEFF" + header + "\r\ncase-1,crm,0000000-00.2026.8.26.0000\r\n")
    expect(result).toEqual({ok:true,items:[{externalId:"case-1",sourceSystem:"crm",cnjDigits:"00000000020268260000"}]})
  })
  it("rejects missing header, missing rows and excess rows", () => {
    expect(parseEnterpriseCsv(row).ok).toBe(false)
    expect(parseEnterpriseCsv(header).ok).toBe(false)
    expect(parseEnterpriseCsv(header+"\n"+Array.from({length:MAX_IMPORT_ITEMS+1},(_,i)=>`case-${i},crm,00000000002026826000`).join("\n")).ok).toBe(false)
  })
  it("rejects duplicate external ids scoped by source system", () => {
    const result = parseEnterpriseCsv(header+"\n"+row+"\n"+row)
    expect(result.ok).toBe(false)
  })
  it("accepts same external id from different systems", () => {
    const result = parseEnterpriseCsv(header+"\n"+row+"\ncase-1,other,00000000002026826000")
    expect(result.ok).toBe(true)
  })
  it.each([
    "case-1,crm", "case-1,crm,000", "case-1,crm,00000000002026826000,extra",
    '"case-1",crm,00000000002026826000', "case-1,,00000000002026826000",
    ",crm,00000000002026826000",
    "case-\u202E1,crm,00000000002026826000",
    "case-1,crm\u200E,00000000002026826000",
    "case-1,cr\tm,00000000002026826000",
    "case-1,crm\t,00000000002026826000",
    "case-1,crm,abc00000000002026826000",
    "case-1,crm,0000000/00/2026/8/26/0000",
    "case-1,crm,00000000002026826000!",
    "case-1,crm,0000000-00.2026.8.26.0000x"
  ])("rejects invalid or ambiguous CSV row: %s", line => {
    expect(parseEnterpriseCsv(header+"\n"+line).ok).toBe(false)
  })
  it("limits raw CSV bytes", () => {
    expect(parseEnterpriseCsv(header+"\n"+row+"X".repeat(MAX_IMPORT_BYTES)).ok).toBe(false)
  })
  it("does not invent data from an empty file", () => {
    expect(parseEnterpriseCsv(" \n").ok).toBe(false)
  })
})
