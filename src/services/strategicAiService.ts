import { supabase } from "@/lib/supabase"

export async function runStrategicAnalysis(caseText: string) {
  const { data, error } = await supabase.functions.invoke("strategic-analysis", {
    body: {
      caseText,
    },
  })

  if (error) {
    console.error("Erro na Edge Function strategic-analysis:", error)
    throw error
  }

  return data
}
