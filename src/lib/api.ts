// Mock API for development - simulates backend responses
// In production, replace with actual Supabase Edge Functions calls

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

// Simulated delay to mimic API call
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// DNA do Juiz mock data
const DNA_JUIZ_DATA = [
  { subject: "Trabalhista", score: 78, fullMark: 100 },
  { subject: "Previdenciário", score: 65, fullMark: 100 },
  { subject: "Tributário", score: 42, fullMark: 100 },
  { subject: "Administrativo", score: 88, fullMark: 100 },
  { subject: "Ambiental", score: 55, fullMark: 100 },
  { subject: "Civil", score: 71, fullMark: 100 },
]

// Score recursal mock data
const SCORE_RECURSAL = [
  { instancia: "1ª Inst.", favoravel: 72, desfavoravel: 28 },
  { instancia: "2ª Inst.", favoravel: 58, desfavoravel: 42 },
  { instancia: "STJ", favoravel: 34, desfavoravel: 66 },
  { instancia: "STF", favoravel: 21, desfavoravel: 79 },
]

// Alertas jurisprudência mock data
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
  // Simulate API delay
  await delay(2000 + Math.random() * 1000)

  // Generate dynamic result based on input
  const baseProbability = Math.floor(Math.random() * 30) + 55
  const caseTypeBonus = {
    TRABALHISTA: 5,
    PREVIDENCIARIO: 8,
    TRIBUTARIO: -3,
  }[input.caseType]

  const successProbability = Math.min(95, Math.max(25, baseProbability + caseTypeBonus))

  return {
    caseNumber: input.caseNumber,
    analysisDate: new Date().toISOString(),
    summary: {
      successProbability,
      riskLevel: successProbability >= 70 ? "BAIXO" : successProbability >= 40 ? "MÉDIO" : "ALTO",
      recommendation: successProbability >= 70
        ? "Caso apresenta fortes argumentos. Recomenda-se prosseguir com a ação."
        : successProbability >= 40
        ? "Caso tem mérito, mas requer усиление dos argumentos. Considere adicionar precedentes."
        : "Caso apresenta riscos significativos. Recomenda-se revisão da estratégia ou acordo.",
      goldSuggestions: [
        "Fundamente em jurisprudência consolidada do tribunal",
        "Apresente laudos periciais complementares",
        "Cite precedentes favoráveis do STJ e STF",
        "Demonstre repercussão social do caso",
      ],
    },
    judgeDNA: {
      padroes: [
        "Prefere decisões fundamentadas em provas documentais",
        "Rejeita argumentos baseados apenas em jurisprudência minoritária",
        "Dá peso significativo a precedentes dos últimos 3 anos",
        "Avalia favoravelmente casos com impacto social",
      ],
      perfil: "Garantista",
      nivelExigencia: "Médio",
    },
    redTeam: {
      fraquezasDoSeuCaso: [
        "Falta de prova documental para alguns fatos",
        "Arguição já rejeitada em casos similares",
        "Prazo prescricional pode ser questionado",
      ],
      probabilidadeDeNegacao: 100 - successProbability,
      comoCorrigir: [
        "Coletar documentos complementares",
        "Buscar precedente específico do tribunal",
        "Preparar resposta para alegação de prescrição",
      ],
    },
    heatmap: {
      zonaVerde: [
        "Violação de direito líquido e certo",
        "Prova documental robusta",
        "Precedente direto do STJ",
      ],
      zonaAmarela: [
        "Argumentos baseados em interpretação econômica",
        "Tese novo sem precedentes consolidados",
        "Questão de valor inferior a 40 salários mínimos",
      ],
      zonaVermelha: [
        "Arguição genérica sem fundamentação",
        "Violação a súmula vinculante",
        "Caso prescrito segundo entendimento majoritário",
      ],
    },
  }
}

export async function performJurisprudenceSearch(input: JurisprudenceSearchInput): Promise<JurisprudenceSearchResult> {
  // Simulate API delay
  await delay(1500 + Math.random() * 1000)

  // Generate dynamic result based on input
  const baseSuccessRate = Math.floor(Math.random() * 25) + 60
  const courtBonus = {
    STJ: 5,
    STF: -5,
    TRF1: 2,
    TRF2: 3,
    TRF3: 8,
    TRF4: 4,
  }[input.court]

  const successRate = Math.min(95, Math.max(35, baseSuccessRate + courtBonus))

  return {
    theme: input.theme,
    decisionsCount: Math.floor(Math.random() * 500) + 100,
    analysis: `Análise jurisprudencial completa sobre "${input.theme}" em ${input.court}.\n\nA jurisprudência predominante nesta matéria é FAVORÁVEL ao autor, com ${successRate}% das decisões siding com a tese apresentada.\n\nPrincipais precedentes:\n- REsp 1.234.567/STJ: Reconhece direito ao benefício\n- REsp 987.654/STJ: Estabelece critérios de cálculo\n- ADI 4.357/STF: Define marco regulatório\n\nTendência: A jurisprudência está em CONSTANTE EVOLUÇÃO, com recentes mudanças favoráveis ao entendimento majoritário.`,
    trend: successRate >= 60 ? "FAVORÁVEL" : successRate >= 40 ? "NEUTRO" : "DESFAVORÁVEL",
    successRate,
    heatmap: {
      zonaVerde: [
        "Argumentos baseados em jurisprudência pacífica",
        "Precedentes do STJ favoráveis",
        "Jurisprudência consolidada",
        "Fundamentação em súmulas",
      ],
      zonaAmarela: [
        "Argumentos com jurisprudência dividida",
        "Precedentes recentes e ainda não consolidados",
        "Tendência em evolução",
        "Posição minoritária com força crescente",
      ],
      zonaVermelha: [
        "Argumentos contrários à jurisprudência dominante",
        "Posições minoritárias",
        "Teses já rejeitadas pelo tribunal",
        "Interpretação contrária ao entendimento atual",
      ],
    },
    recommendations: [
      "Fundamentar em precedentes do STJ",
      "Citar jurisprudência pacífica",
      "Evitar argumentos minoritários",
      "Acompanhar evolução jurisprudencial",
    ],
  }
}

// Export mock data for charts
export const getMockData = () => ({
  DNA_JUIZ_DATA,
  SCORE_RECURSAL,
  ALERTAS_JURISPRUDENCIA,
  TENDENCIAS_TRIBUNAL,
  TIMELINE_MUDANCAS,
})