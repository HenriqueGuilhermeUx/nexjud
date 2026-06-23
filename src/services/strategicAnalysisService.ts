import { supabase } from "@/lib/supabase"

export async function saveAnalysis(data: any) {
  const {
    userId,
    title,
    caseText,
    successProbability,
    riskLevel,
    financialPotential,
    caseDna,
    dealBreakers,
    redTeam,
    strategyEngine,
    partnerDecision,
  } = data

  const { error } = await supabase
    .from("strategic_analyses")
    .insert({
      user_id: userId,
      title,
      case_text: caseText,
      success_probability: successProbability,
      risk_level: riskLevel,
      financial_potential: financialPotential,
      case_dna: caseDna,
      deal_breakers: dealBreakers,
      red_team: redTeam,
      strategy_engine: strategyEngine,
      partner_decision: partnerDecision,
    })

  if (error) throw error
}
