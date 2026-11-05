/**
 * DJEN publications are notices, not automatically court decisions.
 * This is a lawyer-attestation gate; it does not independently authenticate
 * judicial documents or prove magistrate authorship.
 */
const normalize = (value: unknown) => String(value ?? "")
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("pt-BR").trim()

export const DJEN_REVIEWED_TAG = "fonte conferida pelo advogado"
export const DJEN_PENDING_TAG = "revisão manual pendente"

export function hasTrustedCourtReference(value: unknown): boolean {
  if (typeof value !== "string") return false
  const urls = value.match(/https:\/\/[^\s<>"'()]+/gi) || []
  return urls.some(url => {
    try {
      const parsed = new URL(url.replace(/[.,;]+$/, ""))
      return parsed.protocol === "https:" && !parsed.username && !parsed.password &&
        /(?:^|\.)jus\.br$/i.test(parsed.hostname)
    } catch { return false }
  })
}

export function isPrecedentEligibleForDna(item: {
  id?: unknown; fundamento?: unknown; resumo?: unknown; tags?: unknown
}): boolean {
  if (!item?.id || (!String(item.fundamento || "").trim() && !String(item.resumo || "").trim())) return false
  const tags = Array.isArray(item.tags) ? item.tags.map(normalize) : []
  if (tags.some(tag => tag.includes(normalize(DJEN_PENDING_TAG)))) return false
  if (!tags.some(tag => tag === "djen")) return true // Preserve existing non-DJEN references.
  return tags.includes(normalize(DJEN_REVIEWED_TAG)) &&
    hasTrustedCourtReference(item.resumo) &&
    typeof item.fundamento === "string" && item.fundamento.trim().length >= 40
}

export function confirmDjenReview(input: {
  sourceUrl: string; fundamento: string; acknowledged: boolean; tags: string
}): { ok: true; tags: string[] } | { ok: false; reason: string } {
  if (!hasTrustedCourtReference(input.sourceUrl)) {
    return { ok: false, reason: "A fonte deve ser um endereço HTTPS verificável de tribunal (*.jus.br)." }
  }
  if (input.fundamento.trim().length < 40) {
    return { ok: false, reason: "Descreva a fundamentação conferida no inteiro teor (ao menos 40 caracteres)." }
  }
  if (!input.acknowledged) {
    return { ok: false, reason: "Confirme que abriu o documento original e conferiu seu fundamento." }
  }
  const tags = input.tags.split(",").map(tag => tag.trim()).filter(Boolean)
    .filter(tag => normalize(tag) !== normalize(DJEN_PENDING_TAG) &&
      normalize(tag) !== normalize(DJEN_REVIEWED_TAG))
  if (!tags.some(tag => normalize(tag) === "djen")) tags.push("DJEN")
  tags.push(DJEN_REVIEWED_TAG)
  return { ok: true, tags }
}
