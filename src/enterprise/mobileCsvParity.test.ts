import { describe, expect, it } from "vitest"
import { parseEnterpriseCsv as parseWebCsv } from "./csvImport"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import { transpileModule, ModuleKind, ScriptTarget } from "typescript"

// Compile the standalone native validator without loading Expo's tsconfig.
// The module has no native imports; behavior is exercised in an isolated VM.
const nativeSource = readFileSync(
  new URL("../../mobile/src/enterprise/csv.ts", import.meta.url), "utf8"
)
const nativeJs = transpileModule(nativeSource, {
  compilerOptions: { target: ScriptTarget.ES2020, module: ModuleKind.CommonJS },
}).outputText
const exportsObject: Record<string, unknown> = {}
runInNewContext(nativeJs, { exports: exportsObject, Set, JSON, String, Number })
const parseNativeCsv = exportsObject.parseEnterpriseCsv as typeof parseWebCsv
const utf8ByteLength = exportsObject.utf8ByteLength as (value: string) => number

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
  header + "\n" + "id1,crm,abc00000000002026826000",
  header + "\n" + "id1,crm,0000000/00/2026/8/26/0000",
  header + "\n" + "id1,crm,00000000002026826000!",
  header + "\n" + "id1,crm,0000000-00.2026.8.26.0000x",
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
      if (native.ok && web.ok) expect(JSON.parse(JSON.stringify(native.items))).toEqual(web.items)
    }
  )
  it("counts Unicode and surrogate pairs as UTF-8 bytes without TextEncoder", () => {
    expect(utf8ByteLength("abcç😀")).toBe(9)
  })
})
