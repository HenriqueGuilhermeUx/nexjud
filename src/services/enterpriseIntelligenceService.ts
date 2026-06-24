import { supabase } from "@/lib/supabase"

export async function getUserProcesses(userId: string) {
  const { data, error } = await supabase
    .from("process_intelligence")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}

export async function calculateTribunalDna(userId: string, tribunal: string) {
  const processes = await getUserProcesses(userId)
  const filtered = processes.filter((p) => p.tribunal === tribunal)

  const totalProcesses = filtered.length

  const avgMovements =
    totalProcesses > 0
      ? Math.round(
          filtered.reduce(
            (acc, p) => acc + (p?.dados?.process?.movements?.length || 0),
            0
          ) / totalProcesses
        )
      : 0

  const profile =
    avgMovements > 50
      ? "Tribunal altamente movimentado"
      : avgMovements > 20
      ? "Tribunal moderadamente movimentado"
      : "Tribunal enxuto"

  const result = {
    user_id: userId,
    tribunal,
    total_processes: totalProcesses,
    avg_movements: avgMovements,
    profile,
    data: {
      processes: filtered,
      generatedAt: new Date().toISOString(),
    },
    updated_at: new Date().toISOString(),
  }

  await supabase.from("tribunal_dna_cache").insert(result)

  return result
}

export async function calculateOpponentIntelligence(
  userId: string,
  opponentName: string
) {
  const processes = await getUserProcesses(userId)

  const name = opponentName.toLowerCase()

  const filtered = processes.filter((p) =>
    JSON.stringify(p.dados || {}).toLowerCase().includes(name)
  )

  const totalProcesses = filtered.length

  const appealCount = filtered.filter((p) =>
    JSON.stringify(p.dados || {}).toLowerCase().includes("recurso")
  ).length

  const settlementCount = filtered.filter((p) =>
    JSON.stringify(p.dados || {}).toLowerCase().includes("acordo")
  ).length

  const appealSignal =
    totalProcesses > 0 ? Math.round((appealCount / totalProcesses) * 100) : 0

  const settlementSignal =
    totalProcesses > 0 ? Math.round((settlementCount / totalProcesses) * 100) : 0

  const profile =
    appealSignal > 70
      ? "Litigante agressivo"
      : settlementSignal > 40
      ? "Aberto a acordo"
      : "Perfil neutro ou inconclusivo"

  const result = {
    user_id: userId,
    opponent_name: opponentName,
    total_processes: totalProcesses,
    profile,
    appeal_signal: appealSignal,
    settlement_signal: settlementSignal,
    data: {
      processes: filtered,
      generatedAt: new Date().toISOString(),
    },
    updated_at: new Date().toISOString(),
  }

  await supabase.from("opponent_intelligence_cache").insert(result)

  return result
}

export async function calculateClientRisk(userId: string, clientName: string) {
  const processes = await getUserProcesses(userId)

  const name = clientName.toLowerCase()

  const filtered = processes.filter((p) =>
    JSON.stringify(p.dados || {}).toLowerCase().includes(name)
  )

  const total = filtered.length

  const findings: string[] = []

  if (total >= 5) findings.push("Cliente aparece em múltiplos processos.")
  if (total >= 10) findings.push("Volume processual elevado.")
  if (
    filtered.some((p) =>
      JSON.stringify(p.dados || {}).toLowerCase().includes("execução")
    )
  ) {
    findings.push("Há sinais de execução/cobrança nos dados processuais.")
  }

  const riskScore = Math.min(100, total * 10 + findings.length * 15)

  const riskLevel =
    riskScore >= 70 ? "ALTO" : riskScore >= 40 ? "MÉDIO" : "BAIXO"

  const result = {
    user_id: userId,
    client_name: clientName,
    risk_score: riskScore,
    risk_level: riskLevel,
    findings,
    data: {
      processes: filtered,
      generatedAt: new Date().toISOString(),
    },
    updated_at: new Date().toISOString(),
  }

  await supabase.from("client_risk_cache").insert(result)

  return result
}

export async function saveBoardReport(data: any) {
  const { data: saved, error } = await supabase
    .from("board_reports")
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return saved
}

export async function getBoardReports(userId: string) {
  const { data, error } = await supabase
    .from("board_reports")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data || []
}
