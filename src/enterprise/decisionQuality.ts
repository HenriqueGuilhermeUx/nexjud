/** Conservative evidence gates for Enterprise decision support.
 * This module never infers fraud, liability or success probabilities.
 */
export type EvidenceRecord = {
  id: string
  source: string
  collectedAt: string
  documentHash?: string | null
  verified?: boolean
  caseId?: string | null
}

export type DecisionQuality = {
  eligibleForAutomatedSummary: boolean
  eligibleForFinancialPrediction: false
  reasons: string[]
  evidenceCount: number
  verifiedCount: number
}

export function assessDecisionQuality(records: readonly EvidenceRecord[]): DecisionQuality {
  const reasons: string[] = []
  const verified = records.filter((item) =>
    item.verified === true &&
    Boolean(item.id?.trim()) &&
    Boolean(item.source?.trim()) &&
    /^(?:sha256:)?[a-fA-F0-9]{64}$/.test(item.documentHash?.trim() ?? "") &&
    Number.isFinite(Date.parse(item.collectedAt))
  )
  if (records.length === 0) reasons.push("Nenhuma evidência disponível.")
  if (verified.length !== records.length) reasons.push("Há evidências sem fonte, integridade, data ou verificação.")
  const unique = new Set(records.map((item) => item.id))
  if (unique.size !== records.length) reasons.push("Identificadores de evidência duplicados.")
  reasons.push("Previsões financeiras exigem modelo estatístico validado e revisão profissional.")
  return {
    eligibleForAutomatedSummary: records.length > 0 && verified.length === records.length && unique.size === records.length,
    eligibleForFinancialPrediction: false,
    reasons,
    evidenceCount: records.length,
    verifiedCount: verified.length,
  }
}
