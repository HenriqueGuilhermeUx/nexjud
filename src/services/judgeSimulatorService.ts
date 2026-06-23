import { supabase } from "@/lib/supabase"

export async function runJudgeSimulator({
  caseText,
  userArgument,
  hearingType,
  difficulty,
  history,
}: {
  caseText: string
  userArgument: string
  hearingType: string
  difficulty: string
  history: any[]
}) {
  const { data, error } = await supabase.functions.invoke("judge-simulator", {
    body: {
      caseText,
      userArgument,
      hearingType,
      difficulty,
      history,
    },
  })

  if (error) {
    console.error("Erro no Judge Simulator:", error)
    throw error
  }

  return data
}
