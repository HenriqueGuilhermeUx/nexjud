/**
 * A lawyer-supplied excerpt is unverified local working material.
 * It must NEVER be inserted into the audited judicial evidence store or
 * counted as an authenticated court decision.
 */
export interface LawyerProvidedDecisionInput {
  documentReference: string
  sourceUrl: string
  reasoningExcerpt: string
}
export interface LocalReviewDocument {
  documentReference: string | null
  sourceUrl: string | null
  reasoningExcerpt: string
  sourceStatus: "fornecido_pelo_usuario_nao_verificado"
}
export type ManualDocumentResult =
  | { ok: true; document: LocalReviewDocument }
  | { ok: false; error: string }

function browserSafeExternalLink(value: string): string | null {
  if (!value.trim() || value.length > 2048) return null
  try {
    const url = new URL(value.trim())
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "")
    if (/^(localhost|.*\.localhost|.*\.local|127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.|::1$)/.test(hostname)) return null
    return url.href
  } catch {
    return null
  }
}

export function prepareLawyerProvidedDecision(input: LawyerProvidedDecisionInput): ManualDocumentResult {
  const documentReference = input.documentReference.trim()
  const rawUrl = input.sourceUrl.trim()
  const reasoningExcerpt = input.reasoningExcerpt.trim()
  if (!documentReference && !rawUrl)
    return { ok: false, error: "Informe o identificador do documento ou um endereço público de origem." }
  if (documentReference.length > 180)
    return { ok: false, error: "Identificador muito longo (limite de 180 caracteres)." }
  if (rawUrl && !browserSafeExternalLink(rawUrl))
    return { ok: false, error: "O endereço precisa ser HTTP(S) público, sem credenciais ou destinos internos." }
  if (reasoningExcerpt.length < 20)
    return { ok: false, error: "Cole ao menos 20 caracteres de fundamentação do documento original." }
  if (reasoningExcerpt.length > 12000)
    return { ok: false, error: "Trecho extenso demais; selecione até 12 mil caracteres para a conferência local." }
  return {
    ok: true,
    document: {
      documentReference: documentReference || null,
      sourceUrl: rawUrl ? browserSafeExternalLink(rawUrl) : null,
      reasoningExcerpt,
      sourceStatus: "fornecido_pelo_usuario_nao_verificado",
    },
  }
}
