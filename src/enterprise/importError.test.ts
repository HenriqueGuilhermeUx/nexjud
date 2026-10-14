import { describe, expect, it } from "vitest"
import { publicImportError } from "./importError"

describe("Enterprise public import errors", () => {
  it("maps unauthenticated to 401", () => {
    expect(publicImportError("UNAUTHENTICATED").status).toBe(401)
  })
  it("maps forbidden to 403", () => {
    expect(publicImportError("FORBIDDEN").status).toBe(403)
  })
  it("maps idempotency conflict to 409", () => {
    expect(publicImportError("IDEMPOTENCY_CONFLICT").status).toBe(409)
  })
  it("maps unavailability to 503", () => {
    expect(publicImportError("TEMPORARILY_UNAVAILABLE").status).toBe(503)
  })
  it("does not expose process or user data in error", () => {
    expect(JSON.stringify(publicImportError("INVALID_REQUEST"))).not.toContain("organizationId")
  })
})
