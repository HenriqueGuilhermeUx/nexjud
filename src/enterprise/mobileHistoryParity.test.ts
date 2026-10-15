import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import { transpileModule, ModuleKind, ScriptTarget } from "typescript"
import { normalizeImportHistory as webHistory } from "@/components/EnterpriseImportHistory"

const source = readFileSync(new URL("../../mobile/src/enterprise/history.ts", import.meta.url), "utf8")
const compiled = transpileModule(source, {
  compilerOptions: { target: ScriptTarget.ES2020, module: ModuleKind.CommonJS },
}).outputText
const exportsObject: Record<string, unknown> = {}
runInNewContext(compiled, { exports: exportsObject, Number, Array })
const nativeHistory = exportsObject.normalizeImportHistory as typeof webHistory

const valid = {
  batchId: "11111111-1111-4111-8111-111111111111",
  idempotencyKey: "sample-batch",
  itemCount: 2,
  linkedCaseCount: 1,
  createdAt: "2026-10-15T15:00:00Z",
}
const samples: unknown[] = [
  [], [valid], [{ ...valid, linkedCaseCount: 0 }],
  [{ ...valid, linkedCaseCount: 2 }],
  [{ ...valid, linkedCaseCount: 3 }],
  [{ ...valid, itemCount: -1 }],
  [{ ...valid, itemCount: 1.5 }],
  [{ ...valid, itemCount: "2" }],
  [{ ...valid, createdAt: null }],
  [null], [42], null, {}, { data: [valid] },
  Array.from({ length: 50 }, (_, i) => ({ ...valid, batchId: String(i) })),
  Array.from({ length: 51 }, () => valid),
]
describe("NexJud Enterprise history parity: Web/PWA and native Expo", () => {
  it.each(samples.map((sample, index) => [index, sample] as const))(
    "agrees on history projection sample %s", (_index, sample) => {
      const web = webHistory(sample)
      const native = nativeHistory(sample)
      expect(native === null).toBe(web === null)
      if (native !== null && web !== null) {
        expect(JSON.parse(JSON.stringify(native))).toEqual(web)
      }
    }
  )
  it("drops unrecognized private metadata instead of passing it to UI", () => {
    const payload = [{ ...valid, fingerprint: "internal", receipt: { actorId: "private" } }]
    const web = webHistory(payload)
    const native = nativeHistory(payload)
    expect(web?.[0]).not.toHaveProperty("fingerprint")
    expect(web?.[0]).not.toHaveProperty("receipt")
    expect(native?.[0]).not.toHaveProperty("fingerprint")
    expect(native?.[0]).not.toHaveProperty("receipt")
  })
})
