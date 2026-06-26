import { supabase } from "@/lib/supabase"

export async function saveCopilotSession(data: any) {
  const { data: saved, error } = await supabase
    .from("ai_copilot_sessions")
    .insert(data)
    .select()
    .single()

  if (error) {
    console.error("Erro ao salvar sessão Copilot:", error)
    throw error
  }

  return saved
}

export async function getCopilotSessions(userId: string) {
  const { data, error } = await supabase
    .from("ai_copilot_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Erro ao buscar histórico Copilot:", error)
    throw error
  }

  return data || []
}

export async function deleteCopilotSession(id: string) {
  const { error } = await supabase
    .from("ai_copilot_sessions")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Erro ao excluir sessão Copilot:", error)
    throw error
  }

  return true
}
