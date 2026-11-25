// Número CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO (Resolução CNJ 65/2008).
// J = segmento do Judiciário, TR = tribunal dentro do segmento.
// Este módulo não usa APIs do Deno, então também roda nos testes do frontend.

const STATE_COURTS = [
  "ac", "al", "ap", "am", "ba", "ce", "dft", "es", "go", "ma", "mt", "ms", "mg", "pa",
  "pb", "pr", "pe", "pi", "rj", "rn", "rs", "ro", "rr", "sc", "se", "sp", "to",
] as const

export type CourtInfo = { alias: string; name: string }

export function onlyDigits(value: string): string {
  return String(value || "").replace(/\D/g, "")
}

/** Formata 20 dígitos como NNNNNNN-DD.AAAA.J.TR.OOOO. */
export function formatCnj(value: string): string {
  const d = onlyDigits(value)
  if (d.length !== 20) return value
  return `${d.slice(0, 7)}-${d.slice(7, 9)}.${d.slice(9, 13)}.${d.slice(13, 14)}.${d.slice(14, 16)}.${d.slice(16, 20)}`
}

/** Dígito verificador (módulo 97, ISO 7064) conforme a Resolução CNJ 65/2008. */
export function isValidCnj(value: string): boolean {
  const d = onlyDigits(value)
  if (d.length !== 20) return false
  const sequence = d.slice(0, 7)
  const check = d.slice(7, 9)
  const rest = d.slice(9) // ano + J + TR + origem
  const number = BigInt(sequence + rest + check)
  return number % 97n === 1n
}

/** Tribunal do processo, no formato de alias da API pública do DataJud. */
export function courtFromCnj(value: string): CourtInfo | null {
  const d = onlyDigits(value)
  if (d.length !== 20) return null
  const segment = d.slice(13, 14)
  const tr = Number(d.slice(14, 16))
  if (segment === "8" && tr >= 1 && tr <= STATE_COURTS.length) {
    const uf = STATE_COURTS[tr - 1]
    return { alias: `tj${uf}`, name: uf === "dft" ? "TJDFT" : `TJ${uf.toUpperCase()}` }
  }
  if (segment === "4" && tr >= 1 && tr <= 6) return { alias: `trf${tr}`, name: `TRF${tr}` }
  if (segment === "5" && tr >= 1 && tr <= 24) return { alias: `trt${tr}`, name: `TRT${tr}` }
  return null
}
