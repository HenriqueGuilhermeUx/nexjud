import { supabase } from "@/lib/supabase"

export interface StrategicAnalysis {
  id?: string

  userId: string

  title: string
  caseText: string

  successProbability: number
  riskLevel: string
  financialPotential: string

  caseDna?: any
  dealBreakers?: any[]
  redTeam?: any[]
  strategyEngine?: any[]

  partnerDecision?: string

  jurisprudencePrediction?: any
  financialExposure?: any
  partnerCouncil?: any[]
  warRoom?: any
  caseTimeline?: any[]
  tribunalDna?: any
  auditorFindings?: any
  dueDiligence?: any
  legalCommandCenter?: any

  createdAt?: string
}

export async function saveAnalysis(analysis: StrategicAnalysis) {
  const { data, error } = await supabase
    .from("strategic_analyses")
    .insert({
      user_id: analysis.userId,

      title: analysis.title,
      case_text: analysis.caseText,

      success_probability: analysis.successProbability,
      risk_level: analysis.riskLevel,
      financial_potential: analysis.financialPotential,

      case_dna: analysis.caseDna || {},
      deal_breakers: analysis.dealBreakers || [],
      red_team: analysis.redTeam || [],
      strategy_engine: analysis.strategyEngine || [],

      partner_decision: analysis.partnerDecision || "",

      jurisprudence_prediction: analysis.jurisprudencePrediction || {},
      financial_exposure: analysis.financialExposure || {},
      partner_council: analysis.partnerCouncil || [],
      war_room: analysis.warRoom || {},
      case_timeline: analysis.caseTimeline || [],
      tribunal_dna: analysis.tribunalDna || {},
      auditor_findings: analysis.auditorFindings || {},
      due_diligence: analysis.dueDiligence || {},
      legal_command_center: analysis.legalCommandCenter || {},

      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error("Erro ao salvar análise:", error)
    throw error
  }

  return data
}

export async function getUserAnalyses(userId: string) {
  const { data, error } = await supabase
    .from("strategic_analyses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", {
      ascending: false,
    })

  if (error) {
    console.error("Erro ao buscar análises:", error)
    throw error
  }

  return data || []
}

export async function getAnalysisById(analysisId: string) {
  const { data, error } = await supabase
    .from("strategic_analyses")
    .select("*")
    .eq("id", analysisId)
    .single()

  if (error) {
    console.error("Erro ao buscar análise:", error)
    throw error
  }

  return data
}

export async function deleteAnalysis(analysisId: string) {
  const { error } = await supabase
    .from("strategic_analyses")
    .delete()
    .eq("id", analysisId)

  if (error) {
    console.error("Erro ao excluir análise:", error)
    throw error
  }

  return true
}

export async function getAnalysisStats(userId: string) {
  const analyses = await getUserAnalyses(userId)

  const total = analyses.length

  const averageSuccess =
    total > 0
      ? Math.round(
          analyses.reduce(
            (acc, item) => acc + (item.success_probability || 0),
            0
          ) / total
        )
      : 0

  const acceptedCases = analyses.filter((item) =>
    item.partner_decision?.toUpperCase().includes("ACEIT")
  ).length

  return {
    total,
    averageSuccess,
    acceptedCases,
  }
}
