// Static contract tests for the staged Edge Function. No Supabase connection.
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"

const handler = readFileSync(
  new URL("./index.ts", import.meta.url), "utf8"
)

describe("enterprise import HTTP boundary", () => {
  it("requires bearer authorization and validates the user", () => {
    expect(handler).toContain('req.headers.get("authorization")')
    expect(handler).toContain("supabase.auth.getUser(token)")
  })
  it("does not use a service role or accept actor identity", () => {
    expect(handler).not.toContain("SUPABASE_SERVICE_ROLE_KEY")
    expect(handler).toContain('"organizationId", "idempotencyKey", "items"')
  })
  it("enforces request size and item count", () => {
    expect(handler).toContain("MAX_BYTES = 512_000")
    expect(handler).toContain("payload.items.length > 500")
  })
  it("calls the gateway using the user-scoped client", () => {
    expect(handler).toContain('supabase.rpc("enterprise_import_cases"')
    expect(handler).toContain("Authorization: `Bearer ${token}`")
  })
  it("maps replay and conflict statuses", () => {
    expect(handler).toContain('code === "23505"')
    expect(handler).toContain("data.status === \"created\" ? 201 : 200")
  })
})
