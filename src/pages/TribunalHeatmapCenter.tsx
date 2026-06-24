import { useEffect, useState } from "react"
import { Map, Scale, TrendingUp, AlertTriangle } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import {
  saveTribunalHeatmap,
  getTribunalHeatmap,
} from "@/services/enterpriseModulesService"
import { getUserProcesses } from "@/services/enterpriseIntelligenceService"

export default function TribunalHeatmapCenter() {
  const { user } = useAuth()

  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    load()
  }, [user])

  async function load() {
    if (!user?.id) return
    const data = await getTribunalHeatmap(user.id)
    setRecords(data || [])
  }

  async function generateHeatmap() {
    if (!user?.id) return alert("Faça login novamente.")

    setLoading(true)

    try {
      const processes = await getUserProcesses(user.id)

      const grouped = processes.reduce((acc: any, item: any) => {
        const tribunal = item.tribunal || "Não identificado"

        if (!acc[tribunal]) acc[tribunal] = []
        acc[tribunal].push(item)

        return acc
      }, {})

      for (const tribunal of Object.keys(grouped)) {
        const list = grouped[tribunal]

        const total = list.length

        const avgMovements =
          total > 0
            ? Math.round(
                list.reduce(
                  (acc: number, p: any) =>
                    acc + (p?.dados?.process?.movements?.length || 0),
                  0
                ) / total
              )
            : 0

        const riskLevel =
          avgMovements >= 50 ? "ALTO" : avgMovements >= 20 ? "MÉDIO" : "BAIXO"

        const efficiencyScore =
          avgMovements >= 50 ? 35 : avgMovements >= 20 ? 65 : 85

        await saveTribunalHeatmap({
          user_id: user.id,
          tribunal,
          total_processes: total,
          avg_movements: avgMovements,
          risk_level: riskLevel,
          efficiency_score: efficiencyScore,
          data: {
            processes: list,
            generatedAt: new Date().toISOString(),
          },
        })
      }

      await load()
      alert("Tribunal Heatmap gerado.")
    } catch (error) {
      console.error(error)
      alert("Erro ao gerar Tribunal Heatmap.")
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
              <h1 className="text-4xl font-bold">Tribunal Heatmap™</h1>
              <p className="text-muted-foreground mt-1">
                Mapa visual dos tribunais da carteira por volume, movimentação e eficiência.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <button
            onClick={generateHeatmap}
            disabled={loading}
            className="px-6 py-4 rounded-xl bg-primary text-white font-bold disabled:opacity-50"
          >
            {loading ? "Gerando..." : "Gerar Heatmap da Carteira"}
          </button>
        </section>

        <section className="grid md:grid-cols-4 gap-4">
          <Metric title="Tribunais mapeados" value={String(records.length)} color="text-primary" />
          <Metric
            title="Risco alto"
            value={String(records.filter((r) => r.risk_level === "ALTO").length)}
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
            records.map((item) => (
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
                      item.risk_level === "ALTO"
                        ? "text-red-400"
                        : item.risk_level === "MÉDIO"
                        ? "text-yellow-400"
                        : "text-green-400"
                    }
                  />
                  <MiniBox label="Eficiência" value={`${item.efficiency_score || 0}/100`} color="text-primary" />
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
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  )
}

function Metric({ title, value, color = "" }: { title: string; value: string; color?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">{title}</p>
      <h2 className={`text-3xl font-bold mt-1 ${color}`}>{value}</h2>
    </div>
  )
}

function MiniBox({ label, value, color = "" }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl bg-black/20 border border-white/5 p-4">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  )
}
