import { supabase } from "@/lib/supabase"
import { saveProcessIntelligence } from "@/services/processIntelligenceService"

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

export class DatajudLookupError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "DatajudLookupError"
  }
}

async function describeDatajudFailure(error: unknown): Promise<DatajudLookupError> {
  const context = (error as { context?: unknown } | null)?.context
  let status: number | undefined
  let code = ""
  if (context instanceof Response) {
    status = context.status
    try {
      const body = await context.clone().json() as { error?: unknown; status?: unknown }
      code = typeof body?.error === "string" ? body.error : ""
      if (!status && typeof body?.status === "number") status = body.status
    } catch { /* Never expose upstream HTML or personal data. */ }
  }
  if (code.includes("DATAJUD_API_KEY")) {
    return new DatajudLookupError("A integração DataJud não está configurada no servidor. Informe o suporte do NexJud.")
  }
  if (status === 401 || status === 403) {
    return new DatajudLookupError("A consulta foi recusada por autenticação ou permissão. Entre novamente no NexJud; se persistir, informe o suporte.")
  }
  if (status === 404) {
    return new DatajudLookupError("O serviço de consulta processual não foi encontrado neste ambiente. Informe o suporte do NexJud.")
  }
  if (status === 429) {
    return new DatajudLookupError("O DataJud limitou temporariamente as consultas. Aguarde e tente novamente.")
  }
  if (status === 504 || status === 408) {
    return new DatajudLookupError("A consulta ao DataJud excedeu o tempo de resposta. Tente novamente mais tarde.")
  }
  if (status && status >= 500) {
    return new DatajudLookupError("O serviço de consulta processual está indisponível no momento. Informe o suporte se persistir.")
  }
  if (code.includes("Tribunal não identificado") || code.includes("alias válido")) {
    return new DatajudLookupError("Tribunal não reconhecido. Confira o número CNJ e a sigla do tribunal.")
  }
  return new DatajudLookupError("Não foi possível acessar a consulta DataJud. Verifique a conexão e tente novamente; se persistir, informe o suporte.")
}

export async function searchProcessDatajud(
  cnj: string,
  tribunalAlias?: string,
  userId?: string
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
    // Supabase FunctionsHttpError carries a Response in context; never surface raw provider text.
    throw await describeDatajudFailure(error)
  }

  if (data?.error) {
    throw await describeDatajudFailure({ context: Response.json(data, {
      status: typeof data.status === "number" && data.status >= 400 && data.status <= 599 ? data.status : 502,
    }) })
  }

  if (!data || data.success !== true || typeof data.found !== "boolean") {
    throw new DatajudLookupError("O DataJud retornou uma resposta inesperada. Informe o suporte do NexJud.")
  }
  const result = data as DatajudSearchResult

  if (userId && result.found && result.process) {
    const lastMovement = result.process.movements?.[0]

    try {
      await saveProcessIntelligence({
        user_id: userId,
        process_number: result.process.number,
        tribunal: result.process.court,
        classe: result.process.className,
        assunto: result.process.subject,
        orgao_julgador: result.process.courtUnit,
        ultima_movimentacao: lastMovement
          ? `${lastMovement.date || "-"} - ${lastMovement.name}`
          : null,
        dados: {
          alias: result.alias,
          total: result.total,
          process: result.process,
        },
      })
    } catch {
      // Optional history persistence must never invalidate a successful DataJud lookup.
      console.warn("NexJud: consulta concluída, mas não foi possível salvar no histórico.")
    }
  }

  return result
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

  return map[code] || ""
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
