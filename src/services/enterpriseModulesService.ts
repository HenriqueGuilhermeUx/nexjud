import { supabase } from "@/lib/supabase"

export async function saveWarRoomSession(data: any) {
  const { data: saved, error } = await supabase
    .from("war_room_sessions")
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return saved
}

export async function getWarRoomSessions(userId: string) {
  const { data, error } = await supabase
    .from("war_room_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function savePartnerCouncilSession(data: any) {
  const { data: saved, error } = await supabase
    .from("partner_council_sessions")
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return saved
}

export async function getPartnerCouncilSessions(userId: string) {
  const { data, error } = await supabase
    .from("partner_council_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function logOneClickAction(data: any) {
  const { data: saved, error } = await supabase
    .from("one_click_actions_log")
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return saved
}

export async function getOneClickActionsLog(userId: string) {
  const { data, error } = await supabase
    .from("one_click_actions_log")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function saveOpponentDatabase(data: any) {
  const { data: saved, error } = await supabase
    .from("opponent_database")
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return saved
}

export async function getOpponentDatabase(userId: string) {
  const { data, error } = await supabase
    .from("opponent_database")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function saveTribunalHeatmap(data: any) {
  const { data: saved, error } = await supabase
    .from("tribunal_heatmap")
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return saved
}

export async function getTribunalHeatmap(userId: string) {
  const { data, error } = await supabase
    .from("tribunal_heatmap")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}
