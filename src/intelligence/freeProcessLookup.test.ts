import { describe, expect, it, vi } from "vitest"
import { readFileSync } from "node:fs"

vi.mock("@/lib/supabase", () => ({ getSupabase: () => null }))

import { maskCnj } from "../components/FreeProcessLookup"

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8")
const fn = read("../../supabase/functions/public-process-lookup/index.ts")

describe("consulta grátis pelo número CNJ", () => {
  it("formata o número enquanto o usuário digita", () => {
    expect(maskCnj("1000123")).toBe("1000123")
    expect(maskCnj("100012345")).toBe("1000123-45")
    expect(maskCnj("10001234520248260100")).toBe("1000123-45.2024.8.26.0100")
    expect(maskCnj("1000123-45.2024.8.26.0100999")).toBe("1000123-45.2024.8.26.0100")
  })

  it("aparece no site e na página do app", () => {
    expect(read("../pages/Landing.tsx")).toContain("<FreeProcessLookup")
    expect(read("../pages/Companion.tsx")).toContain("<FreeProcessLookup")
  })

  it("a função pública não gasta OpenAI, não devolve partes e tem limite de uso", () => {
    expect(fn).not.toMatch(/api\.openai\.com|OPENAI_API_KEY/)
    expect(fn).not.toMatch(/\.partes\b|poloAtivo|poloPassivo/)
    expect(fn).toContain("PER_IP_PER_HOUR")
    expect(fn).toContain("nivelSigilo")
  })

  it("Verificar Processo não mostra percentuais inventados", () => {
    const check = read("../../supabase/functions/process-check/index.ts")
    const page = read("../pages/ProcessCheck.tsx")
    for (const source of [check, page]) {
      expect(source).not.toMatch(/successProbability:|probability:|Chance estimada|demo-fallback/)
    }
  })
})
