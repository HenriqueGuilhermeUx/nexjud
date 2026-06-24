import { supabase } from "@/lib/supabase"

export async function calculateTribunalDna(tribunal: string) {
  const { data, error } = await supabase
    .from("process_intelligence")
    .select("*")
    .eq("tribunal", tribunal)

  if (error) throw error

  const processes = data || []

  const totalProcesses = processes.length

  const avgMovements =
    totalProcesses > 0
      ? Math.round(
          processes.reduce((acc, p) => {
            return (
              acc +
              (p?.dados?.process?.movements?.length || 0)
            )
          }, 0) / totalProcesses
        )
      : 0

  return {
    tribunal,
    totalProcesses,
    avgMovements,

    profile:
      avgMovements > 50
        ? "Tribunal altamente movimentado"
        : avgMovements > 20
        ? "Tribunal moderadamente movimentado"
        : "Tribunal enxuto",
  }
}
