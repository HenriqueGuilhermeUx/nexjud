import { supabase } from "@/lib/supabase"

export async function createPrecedent(payload: any) {
  const { data, error } = await supabase
    .from("legal_precedents")
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getPrecedents(userId: string) {
  const { data, error } = await supabase
    .from("legal_precedents")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function searchPrecedents(userId: string, query: string) {
  const q = query.trim()

  let request = supabase
    .from("legal_precedents")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (q) {
    request = request.or(
      `title.ilike.%${q}%,tribunal.ilike.%${q}%,tema.ilike.%${q}%,numero.ilike.%${q}%,resumo.ilike.%${q}%,fundamento.ilike.%${q}%,impacto.ilike.%${q}%`
    )
  }

  const { data, error } = await request

  if (error) throw error
  return data || []
}

export async function deletePrecedent(id: string) {
  const { error } = await supabase
    .from("legal_precedents")
    .delete()
    .eq("id", id)

  if (error) throw error
  return true
}
