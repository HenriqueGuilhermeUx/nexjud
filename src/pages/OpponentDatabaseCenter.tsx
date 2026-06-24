import { useEffect, useState } from "react"
import { ShieldAlert, Search, Building2, TrendingUp } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import {
  saveOpponentDatabase,
  getOpponentDatabase,
} from "@/services/enterpriseModulesService"
import { getUserProcesses } from "@/services/enterpriseIntelligenceService"

export default function OpponentDatabaseCenter() {
  const { user } = useAuth()

  const [opponentName, setOpponentName] = useState("")
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    load()
  }, [user])

  async function load() {
    if (!user?.id) return
    const data = await getOpponentDatabase(user.id)
    setRecords(data || [])
  }

  async function analyzeOpponent() {
    if (!user?.id) return alert("Faça login novamente.")
    if (!opponentName.trim()) return alert("Informe o adversário.")

    setLoading(true)

    try {
      const processes = await getUserProcesses(user.id)
      const name = opponentName.toLowerCase()

      const filtered = processes.filter((p) =>
        JSON.stringify(p.dados || {}).toLowerCase().includes(name)
      )

      const total = filtered.length

      const appealCount = filtered.filter((p) =>
        JSON.stringify(p.dados || {}).toLowerCase().includes("recurso")
      ).length

      const settlementCount = filtered.filter((p) =>
        JSON.stringify(p.dados || {}).toLowerCase().includes("acordo")
      ).length

      const appealSignal =
        total > 0 ? Math.round((appealCount / total) * 100) : 0

      const settlementSignal =
        total > 0 ? Math.round((settlementCount / total) * 100) : 0

      const riskLevel =
        appealSignal >= 70 ? "ALTO" : appealSignal >= 35 ? "MÉDIO" : "BAIXO"

      const profile =
        appealSignal >= 70
          ? "Litigante agressivo"
          : settlementSignal >= 40
          ? "Adversário aberto a acordo"
          : "Perfil neutro ou inconclusivo"

      await saveOpponentDatabase({
        user_id: user.id,
        opponent_name: opponentName,
        profile,
        total_processes: total,
        settlement_signal: settlementSignal,
        appeal_signal: appealSignal,
        risk_level: riskLevel,
        notes:
          "Perfil calculado com base nos processos já consultados e salvos na carteira processual.",
        data: {
          processes: filtered,
          generatedAt: new Date().toISOString(),
        },
      })

      await load()
      alert("Opponent Database atualizado.")
    } catch (error) {
      console.error(error)
      alert("Erro ao analisar adversário.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
        <section className="rounded-3xl border border-red-900/50 bg-gradient-to-br from-red-500/10 via-[#111118] to-[#05050a] p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <ShieldAlert className="text-red-400" size={40} />
            <div>
              <h1 className="text-4xl font-bold">Opponent Database™</h1>
              <p className="text-muted-foreground mt-1">
                Banco estratégico de adversários, litigância, acordos e recursos.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-bold text-xl mb-4">Analisar adversário</h2>

          <div className="grid lg:grid-cols-4 gap-3">
            <input
              value={opponentName}
              onChange={(e) => setOpponentName(e.target.value)}
              placeholder="Ex: Banco do Brasil, INSS, Município..."
              className="lg:col-span-3 rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4 outline-none focus:border-primary"
            />

            <button
              onClick={analyzeOpponent}
              disabled={loading}
              className="rounded-xl bg-red-600 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Search size={18} />
              {loading ? "Analisando..." : "Analisar"}
            </button>
          </div>
        </section>

        <section className="grid md:grid-cols-4 gap-4">
          <Metric title="Adversários mapeados" value={String(records.length)} color="text-red-400" />
          <Metric
            title="Agressivos"
            value={String(records.filter((r) => r.risk_level === "ALTO").length)}
            color="text-yellow-400"
          />
          <Metric
            title="Abertos a acordo"
            value={String(records.filter((r) => Number(r.settlement_signal || 0) >= 40).length)}
            color="text-green-400"
          />
          <Metric
            title="Maior sinal de recurso"
            value={`${Math.max(0, ...records.map((r) => Number(r.appeal_signal || 0)))}%`}
            color="text-primary"
          />
        </section>

        <section className="space-y-4">
          {records.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
              Nenhum adversário mapeado ainda.
            </div>
          ) : (
            records.map((item) => (
              <div key={item.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="text-red-400" />
                  <h2 className="font-bold text-xl">{item.opponent_name}</h2>
                </div>

                <div className="grid md:grid-cols-4 gap-3">
                  <MiniBox label="Perfil" value={item.profile || "-"} />
                  <MiniBox label="Processos" value={String(item.total_processes || 0)} />
                  <MiniBox label="Sinal de recurso" value={`${item.appeal_signal || 0}%`} color="text-red-400" />
                  <MiniBox label="Sinal de acordo" value={`${item.settlement_signal || 0}%`} color="text-green-400" />
                </div>

                <p className="text-gray-400 mt-4">{item.notes || "-"}</p>
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
