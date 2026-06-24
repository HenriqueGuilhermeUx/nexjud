import { supabase } from "@/lib/supabase"

export interface RealJurisprudencePrediction {
  alias: string
  totalFound: number
  sampledCases: number
  className: string
  subject: string
  sentenceSignals: number
  appealSignals: number
  historicalStrength: string
  source: string
  warning: string
}

export async function searchSimilarCasesDatajud({
  cnj,
  tribunalAlias,
  classe,
  assunto,
}: {
  cnj?: string
  tribunalAlias?: string
  classe?: string
  assunto?: string
}) {
  const { data, error } = await supabase.functions.invoke(
    "datajud-similar-cases",
    {
      body: {
        cnj,
        tribunalAlias,
        classe,
        assunto,
      },
    }
  )

  if (error) {
    console.error("Erro na Edge Function datajud-similar-cases:", error)
    throw error
  }

  if (data?.error) {
    console.error("Erro DataJud Similar Cases:", data)
    throw new Error(data.error)
  }

  return data as {
    success: boolean
    prediction: RealJurisprudencePrediction
    cases: any[]
  }
}

export function buildRealJurisprudenceText(prediction: RealJurisprudencePrediction) {
  return `
JURISPRUDÊNCIA PREDITIVA REAL — DATAJUD/CNJ

Fonte: ${prediction.source}
Tribunal/Alias: ${prediction.alias}
Classe: ${prediction.className}
Assunto: ${prediction.subject}

Casos encontrados: ${prediction.totalFound}
Amostra analisada: ${prediction.sampledCases}

Sinais de sentença: ${prediction.sentenceSignals}
Sinais de recurso: ${prediction.appealSignals}

Força da base histórica: ${prediction.historicalStrength}

Aviso: ${prediction.warning}
`.trim()
}
