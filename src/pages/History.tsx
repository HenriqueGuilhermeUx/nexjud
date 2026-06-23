import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/AuthContext"

export default function History() {
  const { user } = useAuth()

  const [analyses, setAnalyses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalyses()
  }, [])

  async function loadAnalyses() {
    if (!user) return

    const { data } = await supabase
      .from("strategic_analyses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    setAnalyses(data || [])
    setLoading(false)
  }

  if (loading) {
    return (
      <div className="p-6">
        Carregando...
      </div>
    )
  }

  return (
    <div className="p-6">

      <h1 className="text-3xl font-bold mb-6">
        Histórico Estratégico
      </h1>

      <div className="space-y-4">

        {analyses.map((item) => (
          <div
            key={item.id}
            className="p-5 rounded-xl border border-border bg-card"
          >
            <h2 className="font-bold text-lg">
              {item.title || "Análise Estratégica"}
            </h2>

            <div className="mt-2 grid md:grid-cols-4 gap-4">

              <div>
                <p className="text-xs text-muted-foreground">
                  Chance
                </p>

                <p className="font-bold">
                  {item.success_probability || 0}%
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Risco
                </p>

                <p className="font-bold">
                  {item.risk_level || "-"}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Potencial
                </p>

                <p className="font-bold">
                  {item.financial_potential || "-"}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground">
                  Sócio IA
                </p>

                <p className="font-bold">
                  {item.partner_decision || "-"}
                </p>
              </div>

            </div>
          </div>
        ))}

      </div>
    </div>
  )
}
