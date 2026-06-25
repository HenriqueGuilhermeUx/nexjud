import { supabase } from "@/lib/supabase"

export async function runBoardReportAi({
  portfolioContext,
  tribunalContext,
  opponentContext,
  clientRiskContext,
}: {
  portfolioContext?: string
  tribunalContext?: string
  opponentContext?: string
  clientRiskContext?: string
}) {
  const { data, error } = await supabase.functions.invoke("board-report-ai", {
    body: {
      portfolioContext,
      tribunalContext,
      opponentContext,
      clientRiskContext,
    },
  })

  if (error) {
    console.error("Erro na Edge Function board-report-ai:", error)
    throw error
  }

  if (data?.error) {
    console.error("Erro Board Report AI:", data)
    throw new Error(data.error)
  }

  return data
}
