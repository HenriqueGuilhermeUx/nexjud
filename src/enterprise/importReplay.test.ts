import { describe, expect, it } from "vitest"
import { decideImportReplay } from "./importReplay"

const first = "sha256:" + "a".repeat(64)
const second = "sha256:" + "b".repeat(64)

describe("Enterprise import replay", () => {
  it("accepts new idempotency key", () => {
    expect(decideImportReplay(first, null)).toBe("new")
  })
  it("detects exact replay", () => {
    expect(decideImportReplay(first, first)).toBe("replay")
  })
  it("rejects same key with different payload", () => {
    expect(decideImportReplay(first, second)).toBe("conflict")
  })
  it("rejects malformed fingerprint", () => {
    expect(() => decideImportReplay("sha256:bad", null)).toThrow()
    expect(() => decideImportReplay(first, "bad")).toThrow()
  })
})
