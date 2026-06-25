import { useEffect, useState } from "react"
import { Map, Scale, AlertTriangle, Loader2, Brain } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import {
  saveTribunalHeatmap,
  getTribunalHeatmap,
} from "@/services/enterpriseModulesService"
import { getUserProcesses } from "@/services/enterpriseIntelligenceService"
import { runTribunalHeatmapAi } from "@/services/tribunalHeatmapAiService"

export default function TribunalHeatmapCenter() {
  const { user } = useAuth()

  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [overview, setOverview] = useState("")
  const [alerts, setAlerts] = useState<string[]>([])
  const [recommendedActions, setRecommendedActions] = useState<string[]>([])
  const [confidenceLevel, setConfidenceLevel] = useState("")

  useEffect(() => {
    load()
  }, [user])

  async function load() {
    if (!user?.id) return

    const data = await getTribunalHeatmap(user.id)
    setRecords(data || [])

    const latestAi = (data || []).find((item: any) => item.data?.ai)

    if (latestAi?.data?.ai) {
      setOverview(latestAi.data.ai.overview || "")
      setAlerts(latestAi.data.ai.alerts || [])
      setRecommendedActions(latestAi.data.ai.recommendedActions || [])
      setConfidenceLevel(latestAi.data.ai.confidenceLevel || "")
    }
  }

  async function generateHeatmap() {
    if (!user?.id) return alert("Faça login novamente.")

    setLoading(true)

    try {
      const processes = await getUserProcesses(user.id)

      if (!processes.length) {
        alert("Nenhum processo encontrado na carteira. Consulte processos via CNJ/DataJud primeiro.")
        return
      }

      const grouped = processes.reduce((acc: any, item: any) => {
        const tribunal = item.tribunal || "Não identificado"

        if (!acc[tribunal]) acc[tribunal] = []
        acc[tribunal].push(item)

        return acc
      }, {})

      const tribunalContext = Object.keys(grouped)
        .map((tribunal) => {
          const list = grouped[tribunal]

          const avgMovements =
            list.length > 0
              ? Math.round(
                  list.reduce(
                    (acc: number, p: any) =>
                      acc + (p?.dados?.process?.movements?.length || 0),
                    0
                  ) / list.length
                )
              : 0

          const classes = Array.from(
            new Set(list.map((p: any) => p.classe).filter(Boolean))
          ).join(", ")

          const assuntos = Array.from(
            new Set(list.map((p: any) => p.assunto).filter(Boolean))
          )
            .slice(0, 8)
            .join(", ")

          return `
Tribunal: ${tribunal}
Total de processos: ${list.length}
Média de andamentos: ${avgMovements}
Classes: ${classes || "-"}
Assuntos: ${assuntos || "-"}
`
        })
        .join("\n")

      const ai = await runTribunalHeatmapAi({
        tribunalContext,
      })

      const savedItems: any[] = []

      for (const item of ai.tribunals || []) {
        const tribunal = item.tribunal || "Não identificado"
        const list = grouped[tribunal] || []

        const avgMovements =
          list.length > 0
            ? Math.round(
                list.reduce(
                  (acc: number, p: any) =>
                    acc + (p?.dados?.process?.movements?.length || 0),
                  0
                ) / list.length
              )
            : 0

        const saved = await saveTribunalHeatmap({
          user_id: user.id,
          tribunal,
          total_processes: list.length,
          avg_movements: avgMovements,
          risk_level: item.riskLevel || "MÉDIO",
          efficiency_score: Number(item.efficiencyScore || 0),
          data: {
            aiItem: item,
            ai,
            processes: list,
            generatedAt: new Date().toISOString(),
            source: "tribunal-heatmap-ai",
          },
        })

        savedItems.push(saved)
      }

      setOverview(ai.overview || "")
      setAlerts(ai.alerts || [])
      setRecommendedActions(ai.recommendedActions || [])
      setConfidenceLevel(ai.confidenceLevel || "")
      setRecords((prev) => [...savedItems, ...prev])

      alert("Tribunal Heatmap IA gerado.")
    } catch (error) {
      console.error(error)
      alert("Erro ao gerar Tribunal Heatmap IA.")
    } finally {
      setLoading(false)
    }
  }

  const avgEfficiency =
    records.length > 0
      ? Math.round(
          records.reduce((acc, r) => acc + Number(r.efficiency_score || 0), 0) /
            records.length
        )
      : 0

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
        <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-indigo-500/10 to-[#05050a] p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <Map className="text-primary" size={40} />
            <div>
              <h1 className="text-4xl font-bold">Tribunal Heatmap™ IA</h1>
              <p className="text-muted-foreground mt-1">
                Mapa inteligente dos tribunais da carteira por risco, complexidade, movimentação e eficiência.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <button
            onClick={generateHeatmap}
            disabled={loading}
            className="px-6 py-4 rounded-xl bg-primary text-white font-bold disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Gerando com IA...
              </>
            ) : (
              <>
                <Brain size={18} />
                Gerar Heatmap IA da Carteira
              </>
            )}
          </button>
        </section>

        {(overview || alerts.length > 0 || recommendedActions.length > 0) && (
          <section className="grid lg:grid-cols-3 gap-6">
            <Card title="Visão Geral IA" highlight>
              <MiniBox label="Confiança" value={confidenceLevel || "-"} color="text-primary" />
              <p className="text-gray-300 mt-4 whitespace-pre-line">
                {overview || "-"}
              </p>
            </Card>

            <Card title="Alertas" warning>
              <List items={alerts} prefix="⚠️" />
            </Card>

            <Card title="Ações Recomendadas" success>
              <List items={recommendedActions} prefix="➜" />
            </Card>
          </section>
        )}

        <section className="grid md:grid-cols-4 gap-4">
          <Metric title="Tribunais mapeados" value={String(records.length)} color="text-primary" />
          <Metric
            title="Risco alto"
            value={String(
              records.filter(
                (r) => r.risk_level === "ALTO" || r.risk_level === "CRÍTICO"
              ).length
            )}
            color="text-red-400"
          />
          <Metric
            title="Risco médio"
            value={String(records.filter((r) => r.risk_level === "MÉDIO").length)}
            color="text-yellow-400"
          />
          <Metric title="Eficiência média" value={`${avgEfficiency}/100`} color="text-green-400" />
        </section>

        <section className="grid lg:grid-cols-2 gap-5">
          {records.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground lg:col-span-2">
              Nenhum heatmap gerado ainda.
            </div>
          ) : (
            records.map((item) => {
              const aiItem = item.data?.aiItem || {}

              return (
                <div key={item.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Scale className="text-primary" />
                    <h2 className="font-bold text-xl">{item.tribunal}</h2>
                  </div>

                  <div className="grid md:grid-cols-4 gap-3">
                    <MiniBox label="Processos" value={String(item.total_processes || 0)} />
                    <MiniBox label="Média andamentos" value={String(item.avg_movements || 0)} />
                    <MiniBox
                      label="Risco"
                      value={item.risk_level || "-"}
                      color={
                        item.risk_level === "CRÍTICO" || item.risk_level === "ALTO"
                          ? "text-red-400"
                          : item.risk_level === "MÉDIO"
                          ? "text-yellow-400"
                          : "text-green-400"
                      }
                    />
                    <MiniBox
                      label="Eficiência"
                      value={`${item.efficiency_score || 0}/100`}
                      color="text-primary"
                    />
                  </div>

                  <div className="mt-5">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Eficiência</span>
                      <span>{item.efficiency_score || 0}%</span>
                    </div>
                    <div className="h-3 bg-[#222] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${item.efficiency_score || 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4 mt-5">
                    <MiniBox
                      label="Complexidade"
                      value={`${aiItem.complexityScore || 0}/100`}
                      color="text-yellow-400"
                    />
                    <MiniBox
                      label="Intensidade"
                      value={aiItem.movementIntensity || "-"}
                    />
                  </div>

                  <div className="rounded-xl bg-black/20 border border-white/5 p-4 mt-5">
                    <p className="text-xs text-gray-400 mb-2">Perfil estratégico</p>
                    <p className="text-gray-300 whitespace-pre-line">
                      {aiItem.profile || "-"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-black/20 border border-white/5 p-4 mt-4">
                    <p className="text-xs text-gray-400 mb-2">Orientação prática</p>
                    <p className="text-gray-300 whitespace-pre-line">
                      {aiItem.strategicAdvice || "-"}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </section>
      </div>
    </div>
  )
}

function Metric({
  title,
  value,
  color = "",
}: {
  title: string
  value: string
  color?: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">{title}</p>
      <h2 className={`text-3xl font-bold mt-1 ${color}`}>{value}</h2>
    </div>
  )
}

function MiniBox({
  label,
  value,
  color = "",
}: {
  label: string
  value: string
  color?: string
}) {
  return (
    <div className="rounded-xl bg-black/20 border border-white/5 p-4">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  )
}

function Card({ title, children, highlight, warning, success }: any) {
  return (
    <div
      className={`rounded-2xl border p-6 ${
        highlight
          ? "bg-gradient-to-r from-primary/10 to-indigo-500/10 border-primary/30"
          : warning
          ? "bg-[#111118] border-yellow-900/70"
          : success
          ? "bg-[#111118] border-green-900/70"
          : "bg-[#111118] border-border"
      }`}
    >
      <div
        className={`flex items-center gap-2 mb-4 ${
          warning ? "text-yellow-400" : success ? "text-green-400" : ""
        }`}
      >
        <AlertTriangle className="w-5 h-5" />
        <h2 className="font-bold text-xl">{title}</h2>
      </div>

      {children}
    </div>
  )
}

function List({ items, prefix }: { items?: any[]; prefix: string }) {
  const list = Array.isArray(items) ? items : []

  if (!list.length) {
    return <p className="text-gray-500">Sem itens.</p>
  }

  return (
    <ul className="space-y-2 text-gray-300">
      {list.map((item, index) => (
        <li key={index}>
          {prefix} {String(item)}
        </li>
      ))}
    </ul>
  )
}
