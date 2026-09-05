import { supabase } from "@/lib/supabase"

export type MovementImpactLevel = "low" | "medium" | "high" | "critical" | "unknown"

export interface ProcessMovementInput {
  date?: string | null
  name: string
  complement?: unknown
  [key: string]: unknown
}

export interface ProcessMovementImpactResult {
  ok: boolean
  deduplicated: boolean
  event: any
  impact: {
    impact_level: MovementImpactLevel
    impact_summary?: string
    strategic_effect?: string
    recommended_action?: string
    should_refresh_dossier?: boolean
    notify?: boolean
    notification_title?: string
    notification_message?: string
  }
}

export async function analyzeProcessMovementImpact(params: {
  caseId: string
  processNumber?: string | null
  movement: ProcessMovementInput
}): Promise<ProcessMovementImpactResult> {
  if (!params.caseId) throw new Error("caseId obrigatório")
  if (!params.movement?.name) throw new Error("Movimentação obrigatória")

  const { data, error } = await supabase.functions.invoke("process-movement-impact", {
    body: {
      caseId: params.caseId,
      processNumber: params.processNumber || undefined,
      movement: params.movement,
    },
  })

  if (error) {
    console.error("Erro ao analisar impacto da movimentação:", error)
    throw error
  }

  if (data?.error) throw new Error(data.error)
  return data as ProcessMovementImpactResult
}

export async function getCaseMovementEvents(caseId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Não autenticado")

  const { data, error } = await supabase
    .from("legal_process_movement_events")
    .select("*")
    .eq("user_id", user.id)
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function getUnreadAutomationNotifications(limit = 20) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Não autenticado")

  const { data, error } = await supabase
    .from("automation_notifications")
    .select("*")
    .eq("user_id", user.id)
    .neq("status", "read")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw error
  return data || []
}

export async function markAutomationNotificationRead(id: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Não autenticado")

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from("automation_notifications")
    .update({ status: "read", read_at: now })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single()

  if (error) throw error
  return data
}
