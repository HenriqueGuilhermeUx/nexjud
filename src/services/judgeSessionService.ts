import { supabase } from "@/lib/supabase"

export async function saveJudgeSession({
  userId,
  title,
  caseText,
  hearingType,
  difficulty,
  history,
  lastScore,
}: {
  userId: string
  title: string
  caseText: string
  hearingType: string
  difficulty: string
  history: any[]
  lastScore: number
}) {
  const { data, error } = await supabase
    .from("judge_sessions")
    .insert({
      user_id: userId,
      title,
      case_text: caseText,
      hearing_type: hearingType,
      difficulty,
      history,
      last_score: lastScore,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getJudgeSessions(userId: string) {
  const { data, error } = await supabase
    .from("judge_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function deleteJudgeSession(id: string) {
  const { error } = await supabase
    .from("judge_sessions")
    .delete()
    .eq("id", id)

  if (error) throw error
}
