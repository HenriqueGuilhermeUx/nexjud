import { supabase } from "@/lib/supabase"

export async function runTribunalHeatmapAi({
  tribunalContext,
}: {
  tribunalContext: string
}) {
  const { data, error } = await supabase.functions.invoke("tribunal-heatmap-ai", {
    body: {
      tribunalContext,
    },
  })

  if (error) {
    console.error("Erro na Edge Function tribunal-heatmap-ai:", error)
    throw error
  }

  if (data?.error) {
    console.error("Erro Tribunal Heatmap AI:", data)
    throw new Error(data.error)
  }

  return data
}
