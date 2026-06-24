import { supabase } from "@/lib/supabase"

export async function runWarRoomAi(caseText: string) {
  const { data, error } = await supabase.functions.invoke("war-room-ai", {
    body: {
      caseText,
    },
  })

  if (error) {
    console.error("Erro na Edge Function war-room-ai:", error)
    throw error
  }

  if (data?.error) {
    console.error("Erro War Room AI:", data)
    throw new Error(data.error)
  }

  return data
}
