/** Offline-only import of user-supplied court decision text. Never a verified court source. */
export const LOCAL_COURT_TEXT_MAX_BYTES = 128 * 1024
export const LOCAL_COURT_TEXT_MAX_CHARACTERS = 12000

export type LocalCourtFileCheck = { ok: true } | { ok: false; error: string }
export type LocalCourtTextResult =
  | { ok: true; text: string }
  | { ok: false; error: string }

export function validateLocalCourtFile(name: string, mime: string, size: number): LocalCourtFileCheck {
  if (!/\.(txt|md)$/i.test(name) ||
      !["", "text/plain", "text/markdown", "text/x-markdown"].includes(mime.toLowerCase()))
    return { ok: false, error: "Use somente arquivo de texto .txt ou .md. PDF ainda não é aceito nesta entrada." }
  if (!Number.isSafeInteger(size) || size <= 0 || size > LOCAL_COURT_TEXT_MAX_BYTES)
    return { ok: false, error: "Arquivo vazio ou maior que 128 KB. Selecione apenas o trecho relevante." }
  return { ok: true }
}

export function extractLocalCourtText(contents: string): LocalCourtTextResult {
  if (contents.includes("\u0000"))
    return { ok: false, error: "Arquivo binário detectado; importe um texto UTF-8 legível." }
  const normalized = contents.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim()
  if (normalized.length < 20)
    return { ok: false, error: "O documento precisa conter ao menos 20 caracteres." }
  if (normalized.length > LOCAL_COURT_TEXT_MAX_CHARACTERS)
    return { ok: false, error: "Texto acima de 12 mil caracteres; selecione somente a fundamentação." }
  return { ok: true, text: normalized }
}
