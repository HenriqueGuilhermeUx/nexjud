import { supabase } from "@/lib/supabase"

export async function runOpponentIntelligenceAi({
  opponentName,
  processContext,
}: {
  opponentName: string
  processContext?: string
}) {
  const { data, error } = await supabase.functions.invoke(
    "opponent-intelligence-ai",
    {
      body: {
        opponentName,
        processContext,
      },
    }
  )

  if (error) {
    console.error("Erro na Edge Function opponent-intelligence-ai:", error)
    throw error
  }

  if (data?.error) {
    console.error("Erro Opponent Intelligence AI:", data)
    throw new Error(data.error)
  }

  return data
}
