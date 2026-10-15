/**
 * Minimal, intentionally restricted CSV format shared by web and PWA:
 * externalId,sourceSystem,cnjDigits; no quoted commas or embedded newlines.
 * This prevents silent field displacement in sensitive legal data.
 */
export type EnterpriseCsvItem = {
  externalId: string
  sourceSystem: string
  cnjDigits: string
}
export type CsvParseResult =
  | { ok: true; items: EnterpriseCsvItem[] }
  | { ok: false; error: string }

// Reject invisible controls and directional formatting in legal identifiers.
// Preserve ordinary accented and international letters.
export function hasUnsafeEnterpriseText(value: string): boolean {
  return /[\u0000-\u001F\u007F-\u009F\u00AD\u061C\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/.test(value)
}

export const MAX_IMPORT_BYTES = 512_000
export const MAX_IMPORT_ITEMS = 500
const textBytes = (input: string) => new TextEncoder().encode(input).byteLength

export function parseEnterpriseCsv(input: string): CsvParseResult {
  if (textBytes(input) > MAX_IMPORT_BYTES) {
    return { ok: false, error: "Arquivo muito grande. O máximo é 512 KB por importação." }
  }
  const rows = input.replace(/^\uFEFF/, "").trim().split(/\r?\n/).filter(Boolean)
  if (rows.length < 2 || rows.length > MAX_IMPORT_ITEMS + 1) {
    return { ok: false, error: "Informe cabeçalho e de 1 a 500 processos por lote." }
  }
  if (rows.shift()!.toLowerCase().replace(/\s/g, "") !== "externalid,sourcesystem,cnjdigits") {
    return { ok: false, error: "Cabeçalho obrigatório: externalId,sourceSystem,cnjDigits." }
  }
  const items: EnterpriseCsvItem[] = []
  const seen = new Set<string>()
  for (const [index, line] of rows.entries()) {
    // Reject quotes rather than misparse quoted CSV fields.
    if (line.includes('"') || line.includes("\0")) {
      return { ok: false, error: `Linha ${index + 2}: aspas e caracteres nulos não são suportados neste CSV simples.` }
    }
    const rawColumns = line.split(",")
    if (rawColumns.some(hasUnsafeEnterpriseText)) {
      return { ok: false, error: `Linha ${index + 2}: caracteres invisíveis ou de controle não são permitidos.` }
    }
    const columns = rawColumns.map(value => value.trim())
    if (columns.length !== 3) {
      return { ok: false, error: `Linha ${index + 2}: informe exatamente três colunas separadas por vírgula.` }
    }
    const [externalId, sourceSystem, processNumber] = columns
    // Never silently strip letters or arbitrary punctuation from a legal-case ID.
    // Accept the canonical CNJ mask or exactly 20 ASCII digits.
    if (!/^\d{20}$/.test(processNumber) &&
      !/^\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}$/.test(processNumber)) {
      return { ok: false, error: `Linha ${index + 2}: número CNJ precisa ter 20 dígitos ou a máscara NNNNNNN-DD.AAAA.J.TR.OOOO.` }
    }
    const cnjDigits = processNumber.replace(/[.-]/g, "")
    if (!externalId || externalId.length > 160 || !sourceSystem || sourceSystem.length > 160 ||
      hasUnsafeEnterpriseText(externalId) || hasUnsafeEnterpriseText(sourceSystem) ||
      !/^\d{20}$/.test(cnjDigits)) {
      return { ok: false, error: `Linha ${index + 2}: verifique identificador, origem e número CNJ (20 dígitos).` }
    }
    const identifier = JSON.stringify([sourceSystem, externalId])
    if (seen.has(identifier)) {
      return { ok: false, error: `Linha ${index + 2}: identificador já presente neste lote para a mesma origem.` }
    }
    seen.add(identifier)
    items.push({ externalId, sourceSystem, cnjDigits })
  }
  return { ok: true, items }
}
