import { describe, expect, it } from "vitest"
import { parseEnterpriseCsv as parseWebCsv } from "./csvImport"
import { parseEnterpriseCsv as parseNativeCsv, utf8ByteLength } from "../../mobile/src/enterprise/csv"

const header = "externalId,sourceSystem,cnjDigits"
const row = "id1,crm,00000000002026826000"
const values = [
  header + "\n" + row,
  "\uFEFF" + header + "\r\n" + row,
  header + "\n" + row + "\nid2,other,00000000002026826000",
  header + "\n" + row + "\n" + row,
  header + "\nid1,crm,0000000-00.2026.8.26.0000",
  header + "\n" + '"quoted",crm,00000000002026826000',
  header + "\n" + "id1,crm,not-a-cnj",
  header + "\n" + "id1,,00000000002026826000",
  header + "\n" + "id1,crm,00000000002026826000,extra",
  header,
  "",
  header + "\n" + "id1,crm,00000000002026826000\n".repeat(501),
  header + "\n" + "id1,crm,00000000002026826000" + "ç".repeat(260_000),
]
describe("Web/PWA and native NexJud Enterprise CSV contract parity", () => {
  it.each(values.map((value, index) => [index, value] as const))(
    "agrees on acceptance and normalized items for CSV sample %s", (_index, value) => {
      const web = parseWebCsv(value)
      const native = parseNativeCsv(value)
      expect(native.ok).toBe(web.ok)
      if (native.ok && web.ok) expect(native.items).toEqual(web.items)
    }
  )
  it("counts Unicode and surrogate pairs as UTF-8 bytes without TextEncoder", () => {
    expect(utf8ByteLength("abcç😀")).toBe(10)
  })
})
