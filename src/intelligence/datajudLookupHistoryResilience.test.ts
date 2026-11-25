import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), save: vi.fn() }))
vi.mock("@/lib/supabase", () => ({ supabase: { functions: { invoke: mocks.invoke } } }))
vi.mock("@/services/processIntelligenceService", () => ({ saveProcessIntelligence: mocks.save }))
import { searchProcessDatajud } from "@/services/datajudService"

const process = {
  number: "00012345620268260001", court: "TJSP", courtUnit: "Vara Cível",
  className: "Procedimento Comum", subject: "Direito Civil", filingDate: null,
  parties: [], movements: [],
}

beforeEach(() => {
  mocks.invoke.mockReset()
  mocks.save.mockReset()
  mocks.invoke.mockResolvedValue({ data: { success: true, alias: "tjsp", found: true, process, total: 1 }, error: null })
})

describe("DataJud process lookup resilience", () => {
  it("returns the located process even if optional history saving fails", async () => {
    mocks.save.mockRejectedValue(new Error("storage temporarily unavailable"))
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    try {
      const result = await searchProcessDatajud(process.number, "tjsp", "pilot-user")
      expect(result.found).toBe(true)
      expect(result.process?.number).toBe(process.number)
      expect(mocks.save).toHaveBeenCalledTimes(1)
    } finally { warn.mockRestore() }
  })

  it("does not write process history unless the lawyer requests it", async () => {
    const result = await searchProcessDatajud(process.number, "tjsp")
    expect(result.found).toBe(true)
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it("still reports actual DataJud provider failures as errors", async () => {
    mocks.invoke.mockResolvedValueOnce({ data: null, error: new Error("DataJud indisponível") })
    await expect(searchProcessDatajud(process.number, "tjsp")).rejects.toThrow("DataJud indisponível")
  })
})
