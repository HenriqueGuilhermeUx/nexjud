import { describe, expect, it } from "vitest"
import { validateImportPayload } from "./validation"

const valid = () => ({
  organizationId: "cccccccc-9999-4999-8999-999999999999",
  idempotencyKey: "batch-1",
  items: [{ externalId: "case-1", sourceSystem: "crm", cnjDigits: "00000000002026826000" }],
})
describe("enterprise HTTP import payload validation", () => {
  it("accepts valid tenant-scoped payload", () => {
    expect(validateImportPayload(valid())).toBe(true)
  })
  it.each([
    { ...valid(), actorId: "forged" },
    { ...valid(), fingerprint: "forged" },
    { ...valid(), organizationId: "not-a-uuid" },
    { ...valid(), idempotencyKey: "" },
    { ...valid(), idempotencyKey: "x".repeat(129) },
    { ...valid(), idempotencyKey: "batch\u202E1" },
    { ...valid(), idempotencyKey: "batch\n1" },
    { ...valid(), items: [{ ...valid().items[0], externalId: "case\u200B1" }] },
    { ...valid(), items: [{ ...valid().items[0], sourceSystem: "crm\u200E" }] },
    { ...valid(), items: [] },
    { ...valid(), items: Array.from({ length: 501 }, () => valid().items[0]) },
    { ...valid(), items: [{ ...valid().items[0], cnjDigits: "bad" }] },
    { ...valid(), items: [{ ...valid().items[0], sourceSystem: "" }] },
    { ...valid(), items: [{ ...valid().items[0], unknown: true }] },
  ])("rejects invalid or privileged payload %#", (payload) => {
    expect(validateImportPayload(payload)).toBe(false)
  })
})
