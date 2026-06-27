import { supabase } from "@/lib/supabase"

export async function createJurisprudence(payload: any) {
  const { data, error } = await supabase
    .from("legal_jurisprudence")
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getJurisprudence(userId: string) {
  const { data, error } = await supabase
    .from("legal_jurisprudence")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function searchJurisprudence(userId: string, query: string) {
  const q = query.trim()

  let request = supabase
    .from("legal_jurisprudence")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (q) {
    request = request.or(
      `title.ilike.%${q}%,summary.ilike.%${q}%,content.ilike.%${q}%,theme.ilike.%${q}%,court.ilike.%${q}%`
    )
  }

  const { data, error } = await request

  if (error) throw error
  return data || []
}
