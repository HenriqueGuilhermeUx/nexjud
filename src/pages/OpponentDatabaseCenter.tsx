import { useEffect, useState } from "react"
import { ShieldAlert, Search, Building2 } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import {
  saveOpponentDatabase,
  getOpponentDatabase,
} from "@/services/enterpriseModulesService"
import { getUserProcesses } from "@/services/enterpriseIntelligenceService"
import { runOpponentIntelligenceAi } from "@/services/opponentIntelligenceAiService"

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

      const processContext = filtered
        .slice(0, 5)
        .map((p) => {
          return `
Processo: ${p.process_number || "-"}
Tribunal: ${p.tribunal || "-"}
Classe: ${p.classe || "-"}
Assunto: ${p.assunto || "-"}
Última movimentação: ${p.ultima_movimentacao || "-"}
`
        })
        .join("\n")

      const ai = await runOpponentIntelligenceAi({
        opponentName,
        processContext,
      })

      const total = filtered.length

      const appealSignal =
        ai.appealTrend === "ALTA"
          ? 80
          : ai.appealTrend === "MÉDIA"
          ? 50
          : ai.appealTrend === "BAIXA"
          ? 20
          : 0

      const settlementSignal =
        ai.settlementTrend === "ALTA"
          ? 80
          : ai.settlementTrend === "MÉDIA"
          ? 50
          : ai.settlementTrend === "BAIXA"
          ? 20
          : 0

      const saved = await saveOpponentDatabase({
        user_id: user.id,
        opponent_name: ai.opponentName || opponentName,
        profile: ai.profile || "Perfil inconclusivo.",
        total_processes: total,
        settlement_signal: settlementSignal,
        appeal_signal: appealSignal,
        risk_level: ai.aggressivenessLevel || "MÉDIO",
        notes: ai.executiveSummary || "Análise gerada por IA com base nos dados disponíveis.",
        data: {
          ai,
          processes: filtered,
          generatedAt: new Date().toISOString(),
          source: "opponent-intelligence-ai",
        },
      })

      setRecords((prev) => [saved, ...prev])
      alert("Opponent Intelligence IA salvo.")
    } catch (error) {
      console.error(error)
      alert("Erro ao analisar adversário com IA.")
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
              <h1 className="text-4xl font-bold">Opponent Intelligence™ IA</h1>
              <p className="text-muted-foreground mt-1">
                Banco estratégico de adversários, padrão de defesa, negociação e litígio.
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
              {loading ? "Analisando..." : "Analisar IA"}
            </button>
          </div>
        </section>

        <section className="grid md:grid-cols-4 gap-4">
          <Metric title="Adversários mapeados" value={String(records.length)} color="text-red-400" />
          <Metric
            title="Agressivos"
            value={String(records.filter((r) => r.risk_level === "ALTO" || r.risk_level === "CRÍTICO").length)}
            color="text-yellow-400"
          />
          <Metric
            title="Abertos a acordo"
            value={String(records.filter((r) => Number(r.settlement_signal || 0) >= 50).length)}
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
            records.map((item) => {
              const ai = item.data?.ai || {}

              return (
                <div key={item.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="text-red-400" />
                    <h2 className="font-bold text-xl">{item.opponent_name}</h2>
                  </div>

                  <div className="grid md:grid-cols-4 gap-3">
                    <MiniBox label="Perfil" value={item.profile || "-"} />
                    <MiniBox label="Processos na carteira" value={String(item.total_processes || 0)} />
                    <MiniBox label="Agressividade" value={item.risk_level || "-"} color="text-red-400" />
                    <MiniBox label="Confiança" value={ai.confidenceLevel || "-"} color="text-primary" />
                  </div>

                  <p className="text-gray-300 mt-5 whitespace-pre-line">{item.notes || "-"}</p>

                  <div className="grid lg:grid-cols-2 gap-5 mt-5">
                    <Card title="Padrão de Defesa">
                      <List items={ai.defensePattern} prefix="🛡️" />
                    </Card>

                    <Card title="Pontos de Pressão">
                      <List items={ai.pressurePoints} prefix="🎯" />
                    </Card>

                    <Card title="Fraquezas Potenciais">
                      <List items={ai.weaknesses} prefix="⚠️" />
                    </Card>

                    <Card title="Estratégia de Negociação">
                      <List items={ai.negotiationStrategy} prefix="🤝" />
                    </Card>

                    <Card title="Estratégia de Litígio">
                      <List items={ai.litigationStrategy} prefix="⚔️" />
                    </Card>

                    <Card title="Abordagem Recomendada">
                      <p className="text-gray-300 whitespace-pre-line">
                        {ai.recommendedApproach || "-"}
                      </p>
                    </Card>
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

function Card({ title, children }: any) {
  return (
    <div className="rounded-xl bg-black/20 border border-white/5 p-4">
      <h3 className="font-bold mb-3">{title}</h3>
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
