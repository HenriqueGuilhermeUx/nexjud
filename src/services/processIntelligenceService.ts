import { supabase } from "@/lib/supabase"

export async function saveProcessIntelligence(data: any) {
  const { data: saved, error } = await supabase
    .from("process_intelligence")
    .insert(data)
    .select()
    .single()

  if (error) {
    console.error("Erro ao salvar process intelligence:", error)
    throw error
  }

  return saved
}

export async function getUserProcesses(userId: string) {
  const { data, error } = await supabase
    .from("process_intelligence")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Erro ao buscar processos:", error)
    throw error
  }

  return data || []
}
