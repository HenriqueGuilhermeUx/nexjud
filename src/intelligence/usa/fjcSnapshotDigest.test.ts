import { describe, expect, it } from "vitest"
import { verifyFJCSourceDigest } from "./fjcSnapshotDigest"

const helloSHA256 = "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824"

describe("FJC IDB frozen source digest (synthetic bytes only)", () => {
  it("verifies the exact source bytes with SHA-256", async () => {
    expect(await verifyFJCSourceDigest(new TextEncoder().encode("hello"), helloSHA256)).toBe(true)
  })
  it("rejects corrupted or substituted bytes", async () => {
    expect(await verifyFJCSourceDigest(new TextEncoder().encode("hello!"), helloSHA256)).toBe(false)
  })
  it("rejects missing bytes, malformed hashes and oversized payloads", async () => {
    await expect(verifyFJCSourceDigest(new Uint8Array(0), helloSHA256)).rejects.toThrow()
    await expect(verifyFJCSourceDigest(new Uint8Array([1]), "not-a-sha256")).rejects.toThrow()
    await expect(verifyFJCSourceDigest(new Uint8Array(50_000_001), helloSHA256)).rejects.toThrow()
  })
})
