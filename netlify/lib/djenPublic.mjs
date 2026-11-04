/**
 * Privacy-preserving DJEN metadata reducer.
 * Never return raw communication text, names, recipients or law firm identifiers.
 * A DJEN publication is NOT a judicial decision or proof of magistrate authorship.
 */
export function normalizeDjenPublicPage(data, requestedProcess) {
  if (!data || !Array.isArray(data.items)) throw new Error("invalid_djen_response")
  const requested = String(requestedProcess).replace(/\D/g, "")
  const seen = new Set()
  const items = []
  for (const record of data.items.slice(0, 5)) {
    if (!record || typeof record !== "object") continue
    const process = String(record.numero_processo || record.numeroProcesso || "").replace(/\D/g, "")
    if (process !== requested) continue
    const id = String(record.id ?? record.hash ?? "").slice(0, 120)
    if (!id || seen.has(id)) continue
    seen.add(id)
    const documentType = String(record.tipoDocumento || record.tipo_documento || "").slice(0, 90)
    const publicationKind = String(record.tipoComunicacao || record.tipo_comunicacao || "").slice(0, 90)
    const judgingBody = String(record.nomeOrgao || record.nome_orgao || "").slice(0, 130)
    const court = String(record.siglaTribunal || record.sigla_tribunal || "").slice(0, 18)
    const combined = (documentType + " " + publicationKind).toLocaleLowerCase("pt-BR")
    const candidate = /senten[çc]a|ac[óo]rd[ãa]o|decis[ãa]o/.test(combined)
    const hasReasonedDecision = false // Never infer full reasoning from publication metadata.
    let sourceUrl = null
    try {
      const u = new URL(record.link)
      if (u.protocol === "https:" && !u.username && !u.password &&
          /(?:^|\.)jus\.br$/.test(u.hostname.toLowerCase())) sourceUrl = u.href
    } catch {}
    items.push({
      id, processNumber: process, court, judgingBody, documentType, publicationKind,
      availableDate: String(record.data_disponibilizacao || record.dataDisponibilizacao || "").slice(0, 32),
      candidateForManualReview: candidate,
      confirmedDecision: hasReasonedDecision,
      identifiedJudge: false,
      sourceUrl,
    })
  }
  return {
    source: "CNJ DJEN — comunicação pública",
    disclaimer: "Publicação não comprova inteiro teor, resultado ou autoria de magistrado. Confira o documento no tribunal.",
    countShown: items.length,
    truncated: Number(data.count) > items.length,
    items,
  }
}
