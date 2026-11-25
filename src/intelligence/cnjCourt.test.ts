import { describe, expect, it } from "vitest"
import { courtFromCnj, formatCnj, isValidCnj } from "../../supabase/functions/_shared/cnj.ts"

// Números válidos montados com o dígito verificador correto (módulo 97).
function withCheckDigit(sequence: string, rest: string): string {
  const base = BigInt(sequence + rest + "00")
  const check = String(98n - (base % 97n)).padStart(2, "0")
  return `${sequence}${check}${rest}`
}

describe("número CNJ", () => {
  it("identifica TJs, TRFs e TRTs, inclusive os que não eram cobertos", () => {
    expect(courtFromCnj(withCheckDigit("1000123", "2024826" + "0100"))).toEqual({ alias: "tjsp", name: "TJSP" })
    expect(courtFromCnj(withCheckDigit("1000123", "2024807" + "0001"))).toEqual({ alias: "tjdft", name: "TJDFT" })
    expect(courtFromCnj(withCheckDigit("1000123", "2024805" + "0001"))).toEqual({ alias: "tjba", name: "TJBA" })
    expect(courtFromCnj(withCheckDigit("1000123", "2024827" + "0001"))).toEqual({ alias: "tjto", name: "TJTO" })
    expect(courtFromCnj(withCheckDigit("1000123", "2024406" + "0001"))).toEqual({ alias: "trf6", name: "TRF6" })
    expect(courtFromCnj(withCheckDigit("1000123", "2024524" + "0001"))).toEqual({ alias: "trt24", name: "TRT24" })
  })

  it("recusa segmentos sem API pública mapeada e tamanhos errados", () => {
    expect(courtFromCnj(withCheckDigit("1000123", "2024100" + "0001"))).toBeNull() // STF
    expect(courtFromCnj("123")).toBeNull()
  })

  it("valida o dígito verificador", () => {
    const valid = withCheckDigit("1000123", "20248260100")
    expect(isValidCnj(valid)).toBe(true)
    const broken = valid.slice(0, 7) + (valid[7] === "9" ? "0" : String(Number(valid[7]) + 1)) + valid.slice(8)
    expect(isValidCnj(broken)).toBe(false)
  })

  it("formata no padrão CNJ", () => {
    expect(formatCnj("10001234520248260100")).toBe("1000123-45.2024.8.26.0100")
  })
})
