import { supabase } from "@/lib/supabase"

export async function getDashboardStats(userId: string) {
  const [analysesRes, draftsRes, judgeRes] = await Promise.all([
    supabase
      .from("strategic_analyses")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),

    supabase
      .from("drafts")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),

    supabase
      .from("judge_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ])

  if (analysesRes.error) throw analysesRes.error
  if (draftsRes.error) throw draftsRes.error
  if (judgeRes.error) throw judgeRes.error

  const analyses = analysesRes.data || []
  const drafts = draftsRes.data || []
  const judgeSessions = judgeRes.data || []

  const total = analyses.length

  const avgSuccess =
    total > 0
      ? Math.round(
          analyses.reduce(
            (acc, item) => acc + (item.success_probability || 0),
            0
          ) / total
        )
      : 0

  const accepted = analyses.filter((a) =>
    a.partner_decision?.toUpperCase().includes("ACEIT")
  ).length

  const rejected = analyses.filter((a) =>
    a.partner_decision?.toUpperCase().includes("RECUS")
  ).length

  const avgJudgeScore =
    judgeSessions.length > 0
      ? Math.round(
          judgeSessions.reduce(
            (acc, item) => acc + (item.last_score || 0),
            0
          ) / judgeSessions.length
        )
      : 0

  const latestActivities = [
    ...analyses.slice(0, 3).map((item) => ({
      type: "analysis",
      title: item.title || "Análise estratégica criada",
      date: item.created_at,
      description: `${item.success_probability || 0}% de êxito • ${item.partner_decision || "-"}`,
    })),
    ...drafts.slice(0, 3).map((item) => ({
      type: "draft",
      title: item.title || "Minuta criada",
      date: item.created_at,
      description: item.draft_type || "Minuta NexJud",
    })),
    ...judgeSessions.slice(0, 3).map((item) => ({
      type: "judge",
      title: item.title || "Treino Judge Simulator",
      date: item.created_at,
      description: `Nota ${item.last_score || 0}/100 • ${item.difficulty || "-"}`,
    })),
  ]
    .sort(
      (a, b) =>
        new Date(b.date || 0).getTime() -
        new Date(a.date || 0).getTime()
    )
    .slice(0, 6)

  return {
    total,
    avgSuccess,
    accepted,
    rejected,
    draftsTotal: drafts.length,
    judgeTotal: judgeSessions.length,
    avgJudgeScore,
    latestActivities,
  }
}
