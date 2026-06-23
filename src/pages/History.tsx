import { useEffect, useState } from "react"
import { Trash2, ChevronDown, ChevronUp, FileText, Target, AlertTriangle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/context/AuthContext"
import { generateStrategicPdf } from "@/services/pdfReport"

export default function History() {
  const { user } = useAuth()

  const [analyses, setAnalyses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    loadAnalyses()
  }, [user])

  async function loadAnalyses() {
    if (!user?.id) return

    setLoading(true)

    const { data, error } = await supabase
      .from("strategic_analyses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })

    if (error) {
      console.error(error)
      alert("Erro ao carregar histórico.")
    }

    setAnalyses(data || [])
    setLoading(false)
  }

  async function deleteItem(id: string) {
    const ok = confirm("Deseja excluir esta análise?")
    if (!ok) return

    const { error } = await supabase
      .from("strategic_analyses")
      .delete()
      .eq("id", id)

    if (error) {
      console.error(error)
      alert("Erro ao excluir análise.")
      return
    }

    setAnalyses((prev) => prev.filter((item) => item.id !== id))
  }

  if (loading) {
    return <div className="p-6">Carregando histórico...</div>
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-6">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold">
            Histórico Estratégico
          </h1>
          <p className="text-muted-foreground mt-2">
            Todas as análises salvas pelo escritório ficam organizadas aqui.
          </p>
        </div>

        {analyses.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              Nenhuma análise salva ainda.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {analyses.map((item) => {
              const isOpen = openId === item.id

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-border bg-card overflow-hidden"
                >
                  <div className="p-5">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div>
                        <h2 className="font-bold text-lg">
                          {item.title || "Análise Estratégica"}
                        </h2>

                        <p className="text-xs text-muted-foreground mt-1">
                          {item.created_at
                            ? new Date(item.created_at).toLocaleString("pt-BR")
                            : "-"}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:min-w-[520px]">
                        <MiniMetric label="Chance" value={`${item.success_probability || 0}%`} />
                        <MiniMetric label="Risco" value={item.risk_level || "-"} />
                        <MiniMetric label="Potencial" value={item.financial_potential || "-"} />
                        <MiniMetric label="Sócio IA" value={item.partner_decision || "-"} />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 mt-5">
                      <button
                        onClick={() => setOpenId(isOpen ? null : item.id)}
                        className="px-4 py-2 rounded-xl bg-primary text-white font-semibold flex items-center gap-2"
                      >
                        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        {isOpen ? "Fechar" : "Abrir análise"}
                      </button>

                      <button
                        onClick={() => generateStrategicPdf(item)}
                        className="px-4 py-2 rounded-xl bg-[#171721] border border-border font-semibold flex items-center gap-2"
                      >
                        <FileText size={16} />
                        Exportar PDF
                      </button>

                      <button
                        onClick={() => deleteItem(item.id)}
                        className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-semibold flex items-center gap-2"
                      >
                        <Trash2 size={16} />
                        Excluir
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="border-t border-border p-5 bg-background/40 space-y-6">
                      <div>
                        <h3 className="font-bold mb-2">Caso analisado</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {item.case_text || "-"}
                        </p>
                      </div>

                      <div className="grid lg:grid-cols-2 gap-6">
                        <DetailCard
                          icon={<Target className="text-primary" />}
                          title="Case DNA"
                          data={item.case_dna}
                        />

                        <ListCard
                          icon={<AlertTriangle className="text-red-400" />}
                          title="Deal Breakers"
                          items={item.deal_breakers}
                          prefix="❌"
                        />

                        <ListCard
                          title="Red Team"
                          items={item.red_team}
                          prefix="⚔️"
                        />

                        <ListCard
                          title="Strategy Engine"
                          items={item.strategy_engine}
                          prefix="✓"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  )
}

function DetailCard({ icon, title, data }: any) {
  const entries = data ? Object.entries(data) : []

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="font-bold">{title}</h3>
      </div>

      {entries.length === 0 ? (
        <p className="text-muted-foreground text-sm">Sem dados.</p>
      ) : (
        <div className="space-y-2">
          {entries.map(([key, value]: any) => (
            <div key={key} className="flex justify-between text-sm">
              <span className="capitalize text-muted-foreground">{key}</span>
              <span className="font-bold">{String(value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ListCard({ icon, title, items, prefix }: any) {
  const list = Array.isArray(items) ? items : []

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="font-bold">{title}</h3>
      </div>

      {list.length === 0 ? (
        <p className="text-muted-foreground text-sm">Sem dados.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {list.map((item: string, index: number) => (
            <li key={index}>
              {prefix} {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
