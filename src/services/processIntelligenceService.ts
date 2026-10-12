import { supabase } from "@/lib/supabase"

function normalizeCnjProcess(item: any) {
  const raw = item?.raw_data && typeof item.raw_data === "object" ? item.raw_data : {}
  const rawProcess = raw?.process && typeof raw.process === "object" ? raw.process : {}
  const movements = Array.isArray(item?.movements)
    ? item.movements
    : Array.isArray(rawProcess?.movements)
      ? rawProcess.movements
      : []

  return {
    ...item,
    tribunal: item?.court || item?.tribunal || "",
    orgao_julgador:
      item?.orgao_julgador ||
      rawProcess?.orgaoJulgador ||
      rawProcess?.orgao_julgador ||
      "",
    classe: item?.class_name || item?.classe || "",
    assunto: item?.subject || item?.assunto || "",
    ultima_movimentacao: item?.last_movement || item?.ultima_movimentacao || "",
    dados: {
      ...raw,
      process: {
        ...rawProcess,
        movements,
        parties: item?.parties ?? rawProcess?.parties ?? [],
      },
    },
  }
}

export async function saveProcessIntelligence(data: any) {
  const movements =
    data?.movements ||
    data?.dados?.process?.movements ||
    data?.raw_data?.process?.movements ||
    []

  const payload = {
    user_id: data.user_id,
    case_id: data.case_id || null,
    process_number: data.process_number,
    court: data.court || data.tribunal || null,
    class_name: data.class_name || data.classe || null,
    subject: data.subject || data.assunto || null,
    parties: data.parties || data?.dados?.process?.parties || null,
    movements,
    last_movement: data.last_movement || data.ultima_movimentacao || null,
    last_movement_at: data.last_movement_at || null,
    raw_data: data.raw_data || data.dados || data,
    updated_at: new Date().toISOString(),
  }

  const { data: saved, error } = await supabase
    .from("cnj_processes")
    .upsert(payload, { onConflict: "user_id,process_number" })
    .select()
    .single()

  if (error) {
    console.error("Erro ao salvar inteligência processual CNJ:", error)
    throw error
  }

  return normalizeCnjProcess(saved)
}

export async function getUserProcesses(userId: string) {
  const { data, error } = await supabase
    .from("cnj_processes")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Erro ao buscar processos CNJ:", error)
    throw error
  }

  return (data || []).map(normalizeCnjProcess)
}
