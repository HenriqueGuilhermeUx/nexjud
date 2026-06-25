import { supabase } from "@/lib/supabase"

export async function saveLitigationStrategy(data: any) {
  const { data: saved, error } = await supabase
    .from("litigation_strategies")
    .insert(data)
    .select()
    .single()

  if (error) throw error

  return saved
}

export async function getLitigationStrategies(userId: string) {
  const { data, error } = await supabase
    .from("litigation_strategies")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", {
      ascending: false,
    })

  if (error) throw error

  return data || []
}
