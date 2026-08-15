import { supabase } from "@/lib/supabase"

export async function createPrecedentAnalysis(payload: any) {
  const { data, error } = await supabase.from("legal_precedent_analyses").insert(payload).select().single()
  if (error) throw error
  return data
}

export async function getPrecedentAnalyses(userId: string) {
  const { data, error } = await supabase.from("legal_precedent_analyses").select("*").eq("user_id", userId).order("created_at", { ascending: false })
  if (error) throw error
  return data || []
}

export async function addPrecedentToAnalysis(payload: any) {
  const { data, error } = await supabase.from("legal_precedent_analysis_items").insert(payload).select().single()
  if (error) throw error
  return data
}

export async function saveFactMatrixRow(payload: any) {
  const { data, error } = await supabase.from("legal_precedent_fact_matrix").insert(payload).select().single()
  if (error) throw error
  return data
}

export async function saveEvidenceMatrixRow(payload: any) {
  const { data, error } = await supabase.from("legal_precedent_evidence_matrix").insert(payload).select().single()
  if (error) throw error
  return data
}

export async function createPrecedentMonitor(payload: any) {
  const { data, error } = await supabase.from("legal_precedent_monitors").insert(payload).select().single()
  if (error) throw error
  return data
}

export async function getPrecedentMonitors(userId: string) {
  const { data, error } = await supabase.from("legal_precedent_monitors").select("*").eq("user_id", userId).order("created_at", { ascending: false })
  if (error) throw error
  return data || []
}

export async function createCasePrecedentImpact(payload: any) {
  const { data, error } = await supabase.from("legal_case_precedent_impacts").insert(payload).select().single()
  if (error) throw error
  return data
}

export async function getCasePrecedentImpacts(userId: string, caseId?: string) {
  let request = supabase.from("legal_case_precedent_impacts").select("*").eq("user_id", userId).order("created_at", { ascending: false })
  if (caseId) request = request.eq("case_id", caseId)
  const { data, error } = await request
  if (error) throw error
  return data || []
}

export async function runPrecedentIntelligenceAi({ userId, caseId, caseFacts, legalIssue, precedentIds = [] }: { userId: string; caseId?: string | null; caseFacts: string; legalIssue: string; precedentIds?: string[] }) {
  const { data, error } = await supabase.functions.invoke("precedent-intelligence-ai", {
    body: { userId, caseId: caseId || null, caseFacts, legalIssue, precedentIds },
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}
