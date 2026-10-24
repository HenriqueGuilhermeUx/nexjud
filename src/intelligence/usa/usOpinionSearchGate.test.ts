import { describe, expect, it, vi } from "vitest"
import { runUSOpinionSearch, type USOpinionSearchDependencies } from "./usOpinionSearchGate"

function setup(overrides: Partial<USOpinionSearchDependencies> = {}) {
  const principal = vi.fn(async () => ({ userId: "verified-us-user", tenantId: "verified-us-firm", role: "lawyer" as const }))
  const entitled = vi.fn(async () => true)
  const consumeQuota = vi.fn(async () => true)
  const fetchOpinions = vi.fn(async () => [{
    cluster_id: 6613686, caseName: "Example v. Example", court: "Example Court",
    court_id: "nyed", dateFiled: "2023-01-10",
    absolute_url: "/opinion/6613686/example-v-example/",
    opinions: [{ id: 123, snippet: "Motion granted." }],
  }])
  const deps: USOpinionSearchDependencies = {
    enabled: true,
    commercialUseAuthorized: true,
    principal, entitled, consumeQuota, fetchOpinions,
    collectedAt: () => "2026-10-24T20:00:00Z",
    ...overrides,
  }
  const input = { query: "contract breach", providerDisclosureAccepted: true }
  return { deps, input, principal, entitled, consumeQuota, fetchOpinions }
}

describe("NexJud USA opinion search fail-closed gate", () => {
  it("normalizes authorized public-record metadata without inventing predictions", async () => {
    const x = setup()
    const result = await runUSOpinionSearch(x.input, x.deps)
    expect(result).toMatchObject({ jurisdiction: "US", predictiveModelAvailable: false })
    expect(result.records).toHaveLength(1)
    expect(result.records[0]).toMatchObject({
      sourceRecordId: "6613686", observedOutcome: null, outcomeVerified: false, predictionEligible: false,
    })
    expect(x.consumeQuota).toHaveBeenCalledWith({
      userId: "verified-us-user", tenantId: "verified-us-firm", role: "lawyer",
    })
    expect(x.fetchOpinions).toHaveBeenCalledWith("contract breach")
  })

  it.each([
    [{ enabled: false }, "DISABLED"],
    [{ commercialUseAuthorized: false }, "DISABLED"],
  ] as const)("does not authorize any provider request unless explicitly enabled and licensed", async (settings, code) => {
    const x = setup(settings)
    await expect(runUSOpinionSearch(x.input, x.deps)).rejects.toMatchObject({ code })
    expect(x.principal).not.toHaveBeenCalled()
    expect(x.fetchOpinions).not.toHaveBeenCalled()
  })

  it("requires explicit provider-query disclosure acknowledgement", async () => {
    const x = setup()
    await expect(runUSOpinionSearch({ query: "contract breach" }, x.deps))
      .rejects.toMatchObject({ code: "CONSENT_REQUIRED" })
    expect(x.principal).not.toHaveBeenCalled()
  })

  it.each([
    { ...setup().input, tenantId: "attacker-firm" },
    { ...setup().input, role: "firm_admin" },
    { ...setup().input, userId: "other-user" },
    { ...setup().input, url: "https://attacker.example" },
    { ...setup().input, query: "a" },
    { ...setup().input, query: "123-45-6789" },
    { ...setup().input, query: "contract\nbreach" },
  ])("rejects user-provided authorization identifiers, unsafe or unbounded queries", async (input) => {
    const x = setup()
    await expect(runUSOpinionSearch(input, x.deps)).rejects.toMatchObject({ code: "INVALID_QUERY" })
    expect(x.principal).not.toHaveBeenCalled()
  })

  it("rejects anonymous or unverified tenant membership, insufficient role or entitlement", async () => {
    const a = setup({ principal: vi.fn(async () => null) })
    await expect(runUSOpinionSearch(a.input, a.deps)).rejects.toMatchObject({ code: "UNAUTHENTICATED" })
    const b = setup({ principal: vi.fn(async () => ({ userId: "user", tenantId: "tenant", role: "other" as const })) })
    await expect(runUSOpinionSearch(b.input, b.deps)).rejects.toMatchObject({ code: "FORBIDDEN" })
    const c = setup({ entitled: vi.fn(async () => false) })
    await expect(runUSOpinionSearch(c.input, c.deps)).rejects.toMatchObject({ code: "FORBIDDEN" })
    expect(a.fetchOpinions).not.toHaveBeenCalled()
    expect(b.fetchOpinions).not.toHaveBeenCalled()
    expect(c.fetchOpinions).not.toHaveBeenCalled()
  })

  it("does not send searches to provider when atomic quota denies", async () => {
    const x = setup({ consumeQuota: vi.fn(async () => false) })
    await expect(runUSOpinionSearch(x.input, x.deps)).rejects.toMatchObject({ code: "QUOTA_EXHAUSTED" })
    expect(x.fetchOpinions).not.toHaveBeenCalled()
  })

  it("rejects malformed provider responses instead of swallowing them", async () => {
    const x = setup({ fetchOpinions: vi.fn(async () => ({ results: [] } as unknown as unknown[])) })
    await expect(runUSOpinionSearch(x.input, x.deps)).rejects.toThrow("Invalid provider response.")
  })
})
