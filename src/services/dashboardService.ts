import { supabase } from "@/lib/supabase";

export async function getDashboardStats(userId: string) {
  const { data, error } = await supabase
    .from("strategic_analyses")
    .select("*")
    .eq("user_id", userId);

  if (error) throw error;

  const analyses = data || [];

  const total = analyses.length;

  const avgSuccess =
    total > 0
      ? Math.round(
          analyses.reduce(
            (acc, item) =>
              acc + (item.success_probability || 0),
            0
          ) / total
        )
      : 0;

  const accepted = analyses.filter(
    (a) =>
      a.partner_decision
        ?.toUpperCase()
        .includes("ACEIT")
  ).length;

  const rejected = analyses.filter(
    (a) =>
      a.partner_decision
        ?.toUpperCase()
        .includes("RECUS")
  ).length;

  return {
    total,
    avgSuccess,
    accepted,
    rejected,
  };
}
