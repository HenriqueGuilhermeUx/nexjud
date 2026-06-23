import { supabase } from "@/lib/supabase"

export async function runRedTeamSimulator({
  caseText,
  userMessage,
  role,
  history,
}: {
  caseText: string
  userMessage: string
  role: string
  history: any[]
}) {
  const { data, error } = await supabase.functions.invoke("red-team-simulator", {
    body: {
      caseText,
      userMessage,
      role,
      history,
    },
  })

  if (error) {
    console.error("Erro no Red Team Simulator:", error)
    throw error
  }

  return data
}
