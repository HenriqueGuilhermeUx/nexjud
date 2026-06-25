import { supabase } from "@/lib/supabase"

export async function runLitigationStrategyAi(caseText: string) {
  const { data, error } = await supabase.functions.invoke(
    "litigation-strategy-ai",
    {
      body: {
        caseText,
      },
    }
  )

  if (error) {
    console.error(error)
    throw error
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  return data
}
