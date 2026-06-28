import { supabase } from "@/lib/supabase"

export async function createCnjProcess(payload: any) {
  const { data, error } = await supabase
    .from("cnj_processes")
    .insert(payload)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function searchCnjProcesses(userId: string, query = "") {
  let request = supabase
    .from("cnj_processes")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })

  if (query.trim()) {
    request = request.or(
      `process_number.ilike.%${query}%,court.ilike.%${query}%,class_name.ilike.%${query}%,subject.ilike.%${query}%,last_movement.ilike.%${query}%`
    )
  }

  const { data, error } = await request

  if (error) throw error
  return data || []
}

export async function deleteCnjProcess(id: string) {
  const { error } = await supabase
    .from("cnj_processes")
    .delete()
    .eq("id", id)

  if (error) throw error
  return true
}
