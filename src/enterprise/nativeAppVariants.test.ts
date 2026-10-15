import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"

const raw = readFileSync(new URL("../../mobile/app.config.js", import.meta.url), "utf8")
const base = JSON.parse(readFileSync(new URL("../../mobile/app.json", import.meta.url), "utf8")).expo

function appVariant(mode: string | undefined) {
  const module = { exports: null as null | ((arg: { config: typeof base }) => typeof base) }
  runInNewContext(raw, { module, process: { env: mode ? { EXPO_PUBLIC_NEXJUD_ENV: mode } : {} }, Error })
  return JSON.parse(JSON.stringify(module.exports!({ config: structuredClone(base) })))
}

describe("NexJud installable app variants", () => {
  it("does not change existing production identifiers or permissions", () => {
    expect(appVariant("production")).toEqual(base)
    expect(appVariant(undefined)).toEqual(base)
  })
  it("makes preview installable alongside production on both platforms", () => {
    const x = appVariant("preview")
    expect(x.android.package).toBe(base.android.package + ".preview")
    expect(x.ios.bundleIdentifier).toBe(base.ios.bundleIdentifier + ".preview")
    expect(x.name).toBe("NexJud Homologação")
    expect(x.scheme).toBe("nexjud-preview")
    expect(x.plugins).toEqual(base.plugins)
    expect(x.android.permissions).toEqual(base.android.permissions)
  })
  it("gives development its own separate install identity", () => {
    const x = appVariant("development")
    expect(x.android.package).toBe(base.android.package + ".dev")
    expect(x.ios.bundleIdentifier).toBe(base.ios.bundleIdentifier + ".dev")
    expect(x.scheme).toBe("nexjud-dev")
  })
  it("rejects invalid app environment", () => {
    expect(() => appVariant("misconfigured")).toThrow("invalid build environment")
  })
})

const script = fileURLToPath(new URL("../../mobile/scripts/assert-backend-env.mjs", import.meta.url))
function check(values: Record<string, string>) {
  const env: Record<string, string | undefined> = {
    ...process.env,
    EAS_BUILD: undefined,
    EAS_BUILD_PROFILE: undefined,
    EXPO_PUBLIC_NEXJUD_ENV: undefined,
    EXPO_PUBLIC_SUPABASE_URL: undefined,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: undefined,
    ...values,
  }
  return spawnSync(process.execPath, [script], { env, encoding: "utf8" })
}
const safeStage = {
  EAS_BUILD_PROFILE: "preview",
  EXPO_PUBLIC_NEXJUD_ENV: "preview",
  EXPO_PUBLIC_SUPABASE_URL: "https://nexjud-ci-staging.supabase.co",
  EXPO_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_ci-test",
}
describe("EAS pre-install hook is enforced without EAS_BUILD sentinel", () => {
  it("rejects missing profile and missing staging", () => {
    expect(check({}).status).toBe(1)
    expect(check({ EAS_BUILD_PROFILE: "preview", EXPO_PUBLIC_NEXJUD_ENV: "preview" }).status).toBe(1)
  })
  it("rejects production host, malformed keys and privileged keys in preview", () => {
    expect(check({ ...safeStage, EXPO_PUBLIC_SUPABASE_URL: "https://zoruralbsxrbsaicihzu.supabase.co" }).status).toBe(1)
    expect(check({ ...safeStage, EXPO_PUBLIC_SUPABASE_ANON_KEY: "sb_secret_deny" }).status).toBe(1)
    const prodPayload = Buffer.from(JSON.stringify({ ref: "zoruralbsxrbsaicihzu", role: "anon" })).toString("base64url")
    expect(check({ ...safeStage, EXPO_PUBLIC_SUPABASE_ANON_KEY: "header." + prodPayload + ".sig" }).status).toBe(1)
  })
  it("accepts valid preview only when profile matches", () => {
    expect(check(safeStage).status).toBe(0)
    expect(check({ ...safeStage, EXPO_PUBLIC_NEXJUD_ENV: "production" }).status).toBe(1)
  })
  it("preserves existing production EAS build", () => {
    expect(check({ EAS_BUILD_PROFILE: "production", EXPO_PUBLIC_NEXJUD_ENV: "production" }).status).toBe(0)
    expect(check({ EAS_BUILD_PROFILE: "ios-api-ci", EXPO_PUBLIC_NEXJUD_ENV: "production" }).status).toBe(0)
  })
})
