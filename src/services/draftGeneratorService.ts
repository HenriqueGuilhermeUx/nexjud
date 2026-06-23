import { supabase } from "@/lib/supabase"

export async function generateDraft({
  caseText,
  draftType,
  focus,
}: {
  caseText: string
  draftType: string
  focus?: string
}) {
  const { data, error } = await supabase.functions.invoke("draft-generator", {
    body: {
      caseText,
      draftType,
      focus,
    },
  })

  if (error) {
    console.error("Erro no Draft Generator:", error)
    throw error
  }

  return data
}
