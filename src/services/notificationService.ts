import { supabase } from "@/lib/supabase"

export type NexJudNotification = {
  id: string
  user_id: string | null
  case_id: string | null
  type: string
  priority: "low" | "normal" | "high" | "critical"
  title: string
  message: string
  action_url: string | null
  metadata: Record<string, any>
  status: "pending" | "sent" | "failed" | "read"
  created_at: string
  sent_at: string | null
  read_at: string | null
}

export async function getNotifications(userId: string, limit = 100) {
  const { data, error } = await supabase
    .from("automation_notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []) as NexJudNotification[]
}

export async function getUnreadNotificationCount(userId: string) {
  const { count, error } = await supabase
    .from("automation_notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null)

  if (error) throw error
  return count || 0
}

export async function markNotificationRead(id: string) {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from("automation_notifications")
    .update({ read_at: now, status: "read" })
    .eq("id", id)

  if (error) throw error
}

export async function markAllNotificationsRead(userId: string) {
  const now = new Date().toISOString()
  const { error } = await supabase
    .from("automation_notifications")
    .update({ read_at: now, status: "read" })
    .eq("user_id", userId)
    .is("read_at", null)

  if (error) throw error
}
