export type EcosystemProvider = "docwallet" | "nexoffice" | "nextgen"

export type EcosystemOutcomeEvent = {
  id: string
  user_id: string
  case_id: string
  provider: EcosystemProvider
  event_type: string
  external_event_id: string
  status: "received" | "confirmed" | "rejected"
  document_ref?: string | null
  payment_ref?: string | null
  occurred_at?: string | null
  payload?: Record<string, unknown>
  created_at: string
}

export const ecosystemCapabilities = {
  docwallet: import.meta.env.VITE_NEXJUD_DOCWALLET_ENABLED === "true",
  documentSigning: import.meta.env.VITE_NEXJUD_DOCUMENT_SIGNING_ENABLED === "true",
  obligationIntelligence: import.meta.env.VITE_NEXJUD_OBLIGATION_INTELLIGENCE_ENABLED === "true",
  financialOutcomes: import.meta.env.VITE_NEXJUD_FINANCIAL_OUTCOMES_ENABLED === "true",
  closedLoopOutcomes: import.meta.env.VITE_NEXJUD_CLOSED_LOOP_OUTCOMES_ENABLED === "true",
} as const
