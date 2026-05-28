// NexJud API - Connects to Supabase Edge Functions
// Uses real APIs: CNJ, Escavador, OpenAI

export interface PredictiveAnalysisInput {
  caseNumber: string
  caseDescription: string
  caseType: "TRABALHISTA" | "PREVIDENCIARIO" | "TRIBUTARIO"
}

export interface PredictiveAnalysisResult {
  caseNumber: string
  analysisDate: string
  summary: {
    successProbability: number
    riskLevel: "BAIXO" | "MÉDIO" | "ALTO"
    recommendation: string
    goldSuggestions: string[]
  }
  judgeDNA: {
    padroes: string[]
    perfil: string
    nivelExigencia: string
  }
  redTeam: {
    fraquezasDoSeuCaso: string[]
    probabilidadeDeNegacao: number
    comoCorrigir: string[]
  }
  heatmap: {
    zonaVerde: string[]
    zonaAmarela: string[]
    zonaVermelha: string[]
  }
}

export interface JurisprudenceSearchInput {
  theme: string
  court: "STF" | "STJ" | "TRF1" | "TRF2" | "TRF3" | "TRF4"
  period: "1year" | "3years" | "5years" | "all"
  camara?: string
  materia?: string
}

export interface JurisprudenceSearchResult {
  theme: string
  decisionsCount: number
  analysis: string
  trend: "FAVORÁVEL" | "DESFAVORÁVEL" | "NEUTRO"
  successRate: number
  heatmap: {
    zonaVerde: string[]
    zonaAmarela: string[]
    zonaVermelha: string[]
  }
  recommendations: string[]
}

// Get Supabase URL from environment
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Get user ID from localStorage (set during auth)
const getUserId = (): string => {
  try {
    const sessionData = localStorage.getItem('supabase.session')
    if (sessionData) {
      const session = JSON.parse(sessionData)
      return session?.user?.id || 'anonymous'
    }
  } catch (e) {}
  return 'anonymous'
}

// DNA do Juiz chart data (static mock - real data would come from analysis)
const DNA_JUIZ_DATA = [
  { subject: "Trabalhista", score: 78, fullMark: 100 },
  { subject: "Previdenciário", score: 65, fullMark: 100 },
  { subject: "Tributário", score: 42, fullMark: 100 },
  { subject: "Administrativo", score: 88, fullMark: 100 },
  { subject: "Ambiental", score: 55, fullMark: 100 },
  { subject: "Civil", score: 71, fullMark: 100 },
]

// Score recursal chart data (static mock)
const SCORE_RECURSAL = [
  { instancia: "1ª Inst.", favoravel: 72, desfavoravel: 28 },
  { instancia: "2ª Inst.", favoravel: 58, desfavoravel: 42 },
  { instancia: "STJ", favoravel: 34, desfavoravel: 66 },
  { instancia: "STF", favoravel: 21, desfavoravel: 79 },
]

// Alertas jurisprudência (static mock - real alerts would come from CNJ)
const ALERTAS_JURISPRUDENCIA = [
  { msg: "STJ alterou entendimento sobre correção IPCA-E (Tema 905)", data: "08/05/2026", impacto: "alto" },
  { msg: "TRF-3 uniformizou tese sobre prescrição quinquenal", data: "02/05/2026", impacto: "medio" },
  { msg: "Nova súmula vinculante sobre FGTS — STF", data: "28/04/2026", impacto: "alto" },
]

// Tendências mock data
const TENDENCIAS_TRIBUNAL = [
  { ano: "2022", STJ: 58, STF: 45, TRF3: 72 },
  { ano: "2023", STJ: 62, STF: 48, TRF3: 69 },
  { ano: "2024", STJ: 67, STF: 52, TRF3: 74 },
  { ano: "2025", STJ: 71, STF: 55, TRF3: 78 },
  { ano: "2026", STJ: 74, STF: 58, TRF3: 81 },
]

// Timeline mudanças mock data
const TIMELINE_MUDANCAS = [
  { data: "Abr/2026", evento: "STJ — Tema 905: IPCA-E revisado", impacto: "alto" },
  { data: "Mar/2026", evento: "TRF-3 — Súmula 89: prescrição quinquenal", impacto: "medio" },
  { data: "Fev/2026", evento: "STF — ADI 4357: regime especial", impacto: "alto" },
  { data: "Jan/2026", evento: "TRF-4 — Uniformização FGTS", impacto: "medio" },
]

export async function performPredictiveAnalysis(input: PredictiveAnalysisInput): Promise<PredictiveAnalysisResult> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase não configurado. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY")
  }

  const userId = getUserId()

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-case`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        caseNumber: input.caseNumber,
        caseDescription: input.caseDescription,
        caseType: input.caseType,
        userId: userId,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erro ao analisar caso')
    }

    const result = await response.json()
    return result

  } catch (error) {
    console.error('Erro na análise preditiva:', error)
    // Re-throw for UI to handle
    throw error
  }
}

export async function performJurisprudenceSearch(input: JurisprudenceSearchInput): Promise<JurisprudenceSearchResult> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Supabase não configurado. Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY")
  }

  const userId = getUserId()

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/search-jurisprudence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        theme: input.theme,
        court: input.court,
        period: input.period,
        camara: input.camara || '',
        materia: input.materia || '',
        userId: userId,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Erro ao buscar jurisprudência')
    }

    const result = await response.json()
    return result

  } catch (error) {
    console.error('Erro na busca de jurisprudência:', error)
    throw error
  }
}

// Export mock data for charts (these remain static - could be dynamic in future)
export const getMockData = () => ({
  DNA_JUIZ_DATA,
  SCORE_RECURSAL,
  ALERTAS_JURISPRUDENCIA,
  TENDENCIAS_TRIBUNAL,
  TIMELINE_MUDANCAS,
})