import { describe, expect, it } from "vitest"
import { planEnterpriseImport } from "./importPlanner"

const item = {
  organizationId: "org-a",
  externalId: " case-1 ",
  sourceSystem: "erp",
  cnjNumber: "0000000-00.2026.8.26.0000",
}

describe("Enterprise import planning", () => {
  it("normalizes CNJ and external identifiers", () => {
    expect(planEnterpriseImport({ idempotencyKey: " batch-1 ", items: [item] })).toEqual({
      organizationId: "org-a",
      idempotencyKey: "batch-1",
      uniqueCases: [{ externalId: "case-1", cnjDigits: "00000000020268260000", sourceSystem: "erp" }],
    })
  })
  it("rejects mixed organizations", () => {
    expect(() => planEnterpriseImport({
      idempotencyKey: "batch-1",
      items: [item, { ...item, organizationId: "org-b", externalId: "case-2" }],
    })).toThrow("única organização")
  })
  it("rejects invalid input", () => {
    expect(() => planEnterpriseImport({ idempotencyKey: "", items: [item] })).toThrow()
  })
})
