/** Pure domain workflow. Authorization must also be enforced server-side via RLS/RPC. */
export type CaseStatus = "intake" | "triage" | "evidence_pending" | "ready_for_review" | "approved" | "closed"
export type CaseRole = "owner" | "admin" | "legal" | "reviewer" | "reader"
export type WorkflowAction = "start_triage" | "request_evidence" | "submit_review" | "approve" | "return_evidence" | "close"
export type WorkflowContext = {
  role: CaseRole
  evidenceVerified: boolean
  reviewerIsAuthor: boolean
  justification?: string
}
export type WorkflowResult =
  | { ok: true; nextStatus: CaseStatus }
  | { ok: false; reason: string }

const transitions: Record<CaseStatus, Partial<Record<WorkflowAction, CaseStatus>>> = {
  intake: { start_triage: "triage" },
  triage: { request_evidence: "evidence_pending", submit_review: "ready_for_review" },
  evidence_pending: { submit_review: "ready_for_review" },
  ready_for_review: { approve: "approved", return_evidence: "evidence_pending" },
  approved: { close: "closed", return_evidence: "evidence_pending" },
  closed: {},
}
export function transitionCase(status: CaseStatus, action: WorkflowAction, context: WorkflowContext): WorkflowResult {
  const nextStatus = transitions[status]?.[action]
  if (!nextStatus) return { ok: false, reason: "Transição inválida para o estado atual." }
  if (context.role === "reader") return { ok: false, reason: "Perfil sem permissão de alteração." }
  if (action === "approve") {
    if (!["owner", "admin", "reviewer"].includes(context.role)) return { ok: false, reason: "Aprovação exige perfil revisor." }
    if (context.reviewerIsAuthor) return { ok: false, reason: "O autor não pode aprovar a própria análise." }
    if (!context.evidenceVerified) return { ok: false, reason: "Evidências não verificadas." }
    if (!context.justification?.trim()) return { ok: false, reason: "Justificativa obrigatória." }
  }
  if (action === "close" && !["owner", "admin", "legal"].includes(context.role)) {
    return { ok: false, reason: "Encerramento exige responsável autorizado." }
  }
  return { ok: true, nextStatus }
}
