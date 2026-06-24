import { supabase } from "@/lib/supabase"

export async function runOneClickAi({
  caseText,
  actionType,
  actionTitle,
}: {
  caseText: string
  actionType: string
  actionTitle: string
}) {
  const { data, error } = await supabase.functions.invoke("one-click-ai", {
    body: {
      caseText,
      actionType,
      actionTitle,
    },
  })

  if (error) {
    console.error("Erro na Edge Function one-click-ai:", error)
    throw error
  }

  if (data?.error) {
    console.error("Erro One-Click AI:", data)
    throw new Error(data.error)
  }

  return data
}
