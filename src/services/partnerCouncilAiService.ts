import { supabase } from "@/lib/supabase"

export async function runPartnerCouncilAi(caseText: string) {
  const { data, error } = await supabase.functions.invoke("partner-council-ai", {
    body: {
      caseText,
    },
  })

  if (error) {
    console.error("Erro na Edge Function partner-council-ai:", error)
    throw error
  }

  if (data?.error) {
    console.error("Erro Partner Council AI:", data)
    throw new Error(data.error)
  }

  return data
}
