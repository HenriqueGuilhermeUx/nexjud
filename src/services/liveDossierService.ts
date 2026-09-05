import { supabase } from "@/lib/supabase"

export async function getLiveDossier(userId: string, caseId: string) {
  const { data, error } = await supabase.from("legal_case_dossiers").select("*").eq("user_id", userId).eq("case_id", caseId).maybeSingle()
  if (error) throw error
  return data
}

export async function getAgentRuns(userId: string, caseId: string) {
  const { data, error } = await supabase.from("legal_agent_runs").select("*").eq("user_id", userId).eq("case_id", caseId).order("created_at", { ascending: false }).limit(20)
  if (error) throw error
  return data || []
}

export async function runLiveDossier({ userId, caseId }: { userId: string; caseId: string }) {
  const { data, error } = await supabase.functions.invoke("live-dossier-ai", { body: { userId, caseId } })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}

export async function saveCaseOutcome(payload: { user_id: string; case_id: string; recommendation?: string; lawyer_decision?: string; action_taken?: string; outcome?: string; outcome_type?: string }) {
  const { data, error } = await supabase.from("legal_case_outcomes").insert(payload).select().single()
  if (error) throw error
  return data
}