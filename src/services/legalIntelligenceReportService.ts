import { supabase } from "@/lib/supabase"

export async function saveLegalIntelligenceReport(data: any) {
  const { data: saved, error } = await supabase
    .from("legal_intelligence_reports")
    .insert(data)
    .select()
    .single()

  if (error) {
    console.error("Erro ao salvar Legal Intelligence Report:", error)
    throw error
  }

  return saved
}

export async function getLegalIntelligenceReports(userId: string) {
  const { data, error } = await supabase
    .from("legal_intelligence_reports")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Erro ao buscar Legal Intelligence Reports:", error)
    throw error
  }

  return data || []
}
