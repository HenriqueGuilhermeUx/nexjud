import { supabase } from "@/lib/supabase"

export interface DatajudMovement {
  date: string | null
  name: string
  complement?: any
}

export interface DatajudProcess {
  number: string
  court: string
  courtUnit: string
  className: string
  subject: string
  filingDate: string | null
  parties: any[]
  movements: DatajudMovement[]
  raw?: any
}

export interface DatajudSearchResult {
  success: boolean
  alias: string
  found: boolean
  process: DatajudProcess | null
  total: number
  error?: string
}

export async function searchProcessDatajud(
  cnj: string,
  tribunalAlias?: string
): Promise<DatajudSearchResult> {
  const cleanCnj = String(cnj || "").trim()

  if (!cleanCnj) {
    throw new Error("Número CNJ obrigatório.")
  }

  const { data, error } = await supabase.functions.invoke("datajud-search", {
    body: {
      cnj: cleanCnj,
      tribunalAlias: tribunalAlias || undefined,
    },
  })

  if (error) {
    console.error("Erro na Edge Function datajud-search:", error)
    throw error
  }

  if (data?.error) {
    console.error("Erro DataJud:", data)
    throw new Error(data.error)
  }

  return data as DatajudSearchResult
}

export function formatCnj(value: string) {
  const digits = String(value || "").replace(/\D/g, "")

  if (digits.length !== 20) return value

  return digits.replace(
    /^(\d{7})(\d{2})(\d{4})(\d)(\d{2})(\d{4})$/,
    "$1-$2.$3.$4.$5.$6"
  )
}

export function detectTribunalAliasFromCnj(value: string) {
  const digits = String(value || "").replace(/\D/g, "")
  const code = digits.slice(13, 16)

  const map: Record<string, string> = {
    "826": "tjsp",
    "821": "tjrs",
    "819": "tjrj",
    "813": "tjmg",
    "815": "tjpb",
    "804": "tjam",

    "401": "trf1",
    "402": "trf2",
    "403": "trf3",
    "404": "trf4",
    "405": "trf5",
    "406": "trf6",

    "502": "trt2",
    "515": "trt15",
  }

  return map[code] || "tjsp"
}

export function buildCaseTextFromDatajud(process: DatajudProcess) {
  const movements = (process.movements || [])
    .slice(0, 10)
    .map((m) => {
      const date = m.date ? new Date(m.date).toLocaleDateString("pt-BR") : "-"
      return `- ${date}: ${m.name}`
    })
    .join("\n")

  return `
Processo CNJ: ${process.number}
Tribunal/Órgão: ${process.court}
Unidade: ${process.courtUnit}
Classe: ${process.className}
Assunto: ${process.subject}
Data de ajuizamento/distribuição: ${
    process.filingDate
      ? new Date(process.filingDate).toLocaleDateString("pt-BR")
      : "-"
  }

Últimos andamentos:
${movements || "-"}
`.trim()
}
