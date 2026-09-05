import { supabase } from "@/lib/supabase"

export async function getOfficeIntelligence(userId: string) {
  const [casesRes, memoriesRes, outcomesRes, dossiersRes, impactsRes] = await Promise.all([
    supabase.from("legal_cases").select("id,title,status,risk_level,success_probability,court,tags,created_at").eq("user_id", userId),
    supabase.from("legal_strategic_memories").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
    supabase.from("legal_case_outcomes").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(500),
    supabase.from("legal_case_dossiers").select("case_id,legal_issues,evidence_map,precedent_map,risks,strategy,next_best_actions,confidence_score,last_analyzed_at").eq("user_id", userId),
    supabase.from("legal_case_precedent_impacts").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
  ])

  for (const r of [casesRes, memoriesRes, outcomesRes, dossiersRes, impactsRes]) if (r.error) throw r.error

  const cases = casesRes.data || []
  const memories = memoriesRes.data || []
  const outcomes = outcomesRes.data || []
  const dossiers = dossiersRes.data || []
  const impacts = impactsRes.data || []

  const evidenceGaps = dossiers.flatMap((d: any) => (d.evidence_map || []).filter((e: any) => Boolean(e?.gap)).map((e: any) => ({ case_id: d.case_id, ...e })))
  const risks = dossiers.flatMap((d: any) => (d.risks || []).map((r: any) => ({ case_id: d.case_id, ...r })))
  const issues = dossiers.flatMap((d: any) => (d.legal_issues || []).map((issue: string) => ({ case_id: d.case_id, issue })))

  const normalize = (v: string) => (v || "").toLowerCase().trim()
  const countBy = (values: string[]) => Object.entries(values.reduce((acc: Record<string, number>, value) => {
    const key = normalize(value)
    if (key) acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})).sort((a, b) => b[1] - a[1])

  const resultStatuses = outcomes.filter((o: any) => o.outcome_type === "case_result").reduce((acc: Record<string, number>, o: any) => {
    const key = o.result_status || "unknown"
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  return {
    cases,
    memories,
    outcomes,
    dossiers,
    impacts,
    evidenceGaps,
    risks,
    issues,
    metrics: {
      totalCases: cases.length,
      activeCases: cases.filter((c: any) => c.status === "active").length,
      analyzedCases: dossiers.length,
      strategicMemories: memories.length,
      reusableMemories: memories.filter((m: any) => m.reusable).length,
      evidenceGaps: evidenceGaps.length,
      highRisks: risks.filter((r: any) => normalize(r.level).includes("alto") || normalize(r.level).includes("high")).length,
      decisions: outcomes.filter((o: any) => Boolean(o.lawyer_decision)).length,
      results: outcomes.filter((o: any) => Boolean(o.outcome)).length,
      favorableResults: resultStatuses.favorable || 0,
      partialResults: resultStatuses.partial || 0,
      adverseResults: resultStatuses.adverse || 0,
    },
    rankings: {
      issues: countBy(issues.map((x: any) => x.issue)).slice(0, 10),
      memoryAreas: countBy(memories.map((m: any) => m.area || "")).slice(0, 10),
      courts: countBy(cases.map((c: any) => c.court || "")).slice(0, 10),
      riskTypes: countBy(risks.map((r: any) => r.risk || r.reason || "")).slice(0, 10),
      evidenceRequirements: countBy(evidenceGaps.map((e: any) => e.requirement || "")).slice(0, 10),
    },
  }
}
