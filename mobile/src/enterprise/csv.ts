// Same strict CSV contract as the NexJud Web/PWA parser. No external libraries.
export type EnterpriseImportItem = {
  externalId: string
  sourceSystem: string
  cnjDigits: string
}
export type EnterpriseCsvResult =
  | { ok: true; items: EnterpriseImportItem[] }
  | { ok: false; error: string }
// Reject invisible controls and directional formatting in legal identifiers.
// Preserve ordinary accented and international letters.
export function hasUnsafeEnterpriseText(value: string): boolean {
  return /[\u0000-\u001F\u007F-\u009F\u00AD\u061C\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/.test(value)
}

export const MAX_ENTERPRISE_CSV_BYTES = 512_000
export const MAX_ENTERPRISE_CSV_ROWS = 500

// React Native Hermes compatibility: TextEncoder is not guaranteed globally.
export function utf8ByteLength(value: string): number {
  let size = 0
  for (const char of value) {
    const code = char.codePointAt(0) || 0
    size += code <= 0x7f ? 1 : code <= 0x7ff ? 2 : code <= 0xffff ? 3 : 4
    if (size > MAX_ENTERPRISE_CSV_BYTES) return size
  }
  return size
}

export function parseEnterpriseCsv(value: string): EnterpriseCsvResult {
  if (utf8ByteLength(value) > MAX_ENTERPRISE_CSV_BYTES) {
    return { ok: false, error: "CSV maior que 512 KB. Divida o lote." }
  }
  const rows = value.replace(/^\uFEFF/, "").trim().split(/\r?\n/).filter(Boolean)
  if (rows.length < 2 || rows.length > MAX_ENTERPRISE_CSV_ROWS + 1) {
    return { ok: false, error: "Informe cabeçalho e de 1 a 500 processos." }
  }
  const header = (rows.shift() || "").toLowerCase().replace(/\s/g, "")
  if (header !== "externalid,sourcesystem,cnjdigits") {
    return { ok: false, error: "Cabeçalho obrigatório: externalId,sourceSystem,cnjDigits." }
  }
  const seen = new Set<string>()
  const items: EnterpriseImportItem[] = []
  for (const [index, row] of rows.entries()) {
    if (row.includes('"') || row.includes("\0")) {
      return { ok: false, error: `Linha ${index + 2}: aspas ou caracteres nulos não são permitidos.` }
    }
    const fields = row.split(",").map(x => x.trim())
    if (fields.length !== 3) {
      return { ok: false, error: `Linha ${index + 2}: use exatamente três colunas.` }
    }
    const [externalId, sourceSystem, cnjInput] = fields
    // Only canonical CNJ punctuation is accepted; do not silently discard
    // letters, symbols or malformed delimiters in a legal case number.
    if (!/^\d{20}$/.test(cnjInput) &&
        !/^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/.test(cnjInput)) {
      return { ok: false, error: `Linha ${index + 2}: CNJ requer 20 dígitos ou a máscara NNNNNNN-DD.AAAA.J.TR.OOOO.` }
    }
    const cnjDigits = cnjInput.replace(/[.-]/g, "")
    if (!externalId || externalId.length > 160 || !sourceSystem ||
        hasUnsafeEnterpriseText(externalId) || hasUnsafeEnterpriseText(sourceSystem) ||
        sourceSystem.length > 160 || !/^\d{20}$/.test(cnjDigits)) {
      return { ok: false, error: `Linha ${index + 2}: identificador, sistema ou CNJ inválido.` }
    }
    const key = JSON.stringify([sourceSystem, externalId])
    if (seen.has(key)) {
      return { ok: false, error: `Linha ${index + 2}: processo duplicado para a mesma origem.` }
    }
    seen.add(key)
    items.push({ externalId, sourceSystem, cnjDigits })
  }
  return { ok: true, items }
}
