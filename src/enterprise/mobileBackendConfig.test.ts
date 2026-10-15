import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import { transpileModule, ModuleKind, ScriptTarget } from "typescript"

const native = readFileSync(new URL("../../mobile/src/lib/backendConfig.ts", import.meta.url), "utf8")
const js = transpileModule(native, { compilerOptions: {
  module: ModuleKind.CommonJS, target: ScriptTarget.ES2020,
}}).outputText
const output: Record<string, unknown> = {}
runInNewContext(js, { exports: output, URL, Error })
type Opts = { mode?: string; stageUrl?: string; stageKey?: string; productionUrl: string; productionKey: string }
const resolve = output.resolveBackend as (o: Opts) => { url: string; key: string; mode: string }
const prod = { productionUrl: "https://prod.supabase.co", productionKey: "public-prod" }

describe("NexJud native preview backend must not touch production", () => {
  it("preserves existing production values when explicitly in production", () => {
    expect(JSON.parse(JSON.stringify(resolve({ ...prod, mode:"production" })))).toEqual({
      url:prod.productionUrl, key:prod.productionKey, mode:"production",
    })
  })
  it("refuses an unconfigured preview", () => {
    expect(() => resolve({ ...prod, mode:"preview" })).toThrow("não configurado")
  })
  it("blocks a preview pointed to production endpoint or key", () => {
    expect(() => resolve({ ...prod, mode:"preview", stageUrl:prod.productionUrl, stageKey:"public-stage" }))
      .toThrow("produção")
    expect(() => resolve({ ...prod, mode:"preview", stageUrl:"https://stage.supabase.co", stageKey:prod.productionKey }))
      .toThrow("produção")
  })
  it("accepts a separate HTTPS test project", () => {
    const s = resolve({ ...prod, mode:"preview", stageUrl:"https://stage.supabase.co", stageKey:"public-stage" })
    expect(s.url).toBe("https://stage.supabase.co")
    expect(s.mode).toBe("preview")
  })
  it("rejects insecure preview and allows loopback only in development", () => {
    expect(() => resolve({ ...prod, mode:"preview", stageUrl:"http://localhost:54321", stageKey:"public-stage" })).toThrow("HTTPS")
    expect(resolve({ ...prod, mode:"development", stageUrl:"http://127.0.0.1:54321", stageKey:"public-stage" }).mode)
      .toBe("development")
  })
  it("denies privileged keys and disguised Supabase URLs even if the build hook was skipped", () => {
    const base = { ...prod, mode: "preview", stageUrl: "https://stage.supabase.co", stageKey: "sb_publishable_example" }
    expect(() => resolve({ ...base, stageKey: "sb_secret_invalid-for-client" })).toThrow("privilegiada")
    expect(() => resolve({ ...base, stageUrl: "https://login:password@stage.supabase.co" })).toThrow("credenciais")
    expect(() => resolve({ ...base, stageUrl: "https://stage.supabase.co/another-project" })).toThrow("parâmetros")
    expect(() => resolve({ ...base, stageUrl: "https://stage.supabase.co/?access=token" })).toThrow("parâmetros")
    expect(() => resolve({ ...base, stageUrl: "https://stage.supabase.co/#secret" })).toThrow("parâmetros")
    expect(resolve(base).mode).toBe("preview")
  })
  it("blocks an unknown environment", () => {
    expect(() => resolve({ ...prod, mode:"broken" })).toThrow("desconhecido")
  })
})
