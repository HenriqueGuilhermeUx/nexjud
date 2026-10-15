import { describe, expect, it } from "vitest"
import { parseImportedCase } from "./importedCases"

const user = "aaaaaaaa-1111-4111-8111-111111111111"
const org = "bbbbbbbb-2222-4222-8222-222222222222"
const imported = () => ({
  id: "cccccccc-3333-4333-8333-333333333333",
  user_id: user,
  title: "Processo de teste",
  process_number: "00000000002026826000",
  created_at: "2026-10-14T12:00:00Z",
  metadata: { enterpriseImport: {
    organizationId: org, sourceSystem: "crm", externalId: "client-1",
  } },
})

describe("owned enterprise case projection", () => {
  it("returns only the imported case fields needed by the UI", () => {
    const result = parseImportedCase(imported(), org, user)
    expect(result).toEqual({
      id: imported().id,
      title: imported().title,
      processNumber: imported().process_number,
      sourceSystem: "crm",
      externalId: "client-1",
      createdAt: imported().created_at,
    })
  })
  it("does not project another organization's imported case", () => {
    expect(parseImportedCase(imported(), "dddddddd-4444-4444-8444-444444444444", user)).toBeNull()
  })
  it("does not project another owner's imported case", () => {
    expect(parseImportedCase(imported(), org, "eeeeeeee-5555-4555-8555-555555555555")).toBeNull()
  })
  it("does not confuse a normal legal case with an Enterprise import", () => {
    expect(parseImportedCase({ ...imported(), metadata: {} }, org, user)).toBeNull()
  })
  it("rejects malformed import metadata", () => {
    expect(parseImportedCase({ ...imported(), metadata: { enterpriseImport: {
      organizationId: org, sourceSystem: 34, externalId: "x",
    }} }, org, user)).toBeNull()
  })
});
