import { useEffect, useState } from "react"
import {
  Brain,
  AlertTriangle,
  TrendingUp,
  FileText,
  Clock,
  ShieldAlert,
  Sparkles,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { getDashboardStats } from "@/services/dashboardService"
import { getUserProcesses } from "@/services/enterpriseIntelligenceService"

export default function ChiefLegalOfficer() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [processes, setProcesses] = useState<any[]>([])

  useEffect(() => {
    load()
  }, [user])

  async function load() {
    if (!user?.id) return

    setLoading(true)

    try {
      const [dashboardStats, userProcesses] = await Promise.all([
        getDashboardStats(user.id).catch(() => null),
        getUserProcesses(user.id).catch(() => []),
      ])

      setStats(dashboardStats)
      setProcesses(userProcesses || [])
    } catch (error) {
      console.error(error)
      alert("Erro ao carregar Chief Legal Officer.")
    } finally {
      setLoading(false)
    }
  }

  const totalProcesses = processes.length
  const criticalProcesses = processes.filter((p) =>
    JSON.stringify(p.dados || {}).toLowerCase().includes("execução")
  ).length

  const tribunals = new Set(processes.map((p) => p.tribunal).filter(Boolean)).size
  const classes = new Set(processes.map((p) => p.classe).filter(Boolean)).size

  if (loading) {
    return <div className="p-6">Carregando AI Chief Legal Officer...</div>
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
        <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-indigo-500/10 to-[#05050a] p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="text-primary" size={44} />
            <div>
              <h1 className="text-4xl font-bold">AI Chief Legal Officer™</h1>
              <p className="text-muted-foreground mt-1">
                O resumo executivo diário da sua operação jurídica.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-primary/20 bg-card p-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-primary" />
            <h2 className="text-2xl font-bold">Bom dia.</h2>
          </div>

          <p className="text-gray-300 text-lg leading-relaxed">
            Hoje sua carteira possui <strong>{totalProcesses}</strong> processos monitorados,
            distribuídos em <strong>{tribunals}</strong> tribunais e <strong>{classes}</strong> classes.
            Existem <strong>{criticalProcesses}</strong> sinais críticos preliminares e{" "}
            <strong>{stats?.total || 0}</strong> análises estratégicas salvas.
          </p>

          <p className="text-gray-400 mt-4">
            Recomendação: comece pelos processos com maior risco, depois gere Litigation Strategy
            para os casos com maior potencial econômico.
          </p>
        </section>

        <section className="grid md:grid-cols-4 gap-4">
          <Metric title="Processos" value={String(totalProcesses)} color="text-primary" icon={<FileText />} />
          <Metric title="Sinais críticos" value={String(criticalProcesses)} color="text-red-400" icon={<AlertTriangle />} />
          <Metric title="Análises" value={String(stats?.total || 0)} color="text-green-400" icon={<TrendingUp />} />
          <Metric title="Score Judge" value={`${stats?.avgJudgeScore || 0}/100`} color="text-yellow-400" icon={<ShieldAlert />} />
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          <Card title="Prioridades de Hoje" icon={<Clock className="text-primary" />}>
            <List
              items={[
                "Revisar processos com sinais críticos.",
                "Gerar Litigation Strategy nos casos de maior valor.",
                "Usar Legal Intelligence para consolidar relatório executivo.",
                "Transformar análises relevantes em minutas ou propostas de acordo.",
              ]}
            />
          </Card>

          <Card title="Recomendações Executivas" icon={<Brain className="text-primary" />}>
            <List
              items={[
                totalProcesses === 0
                  ? "Cadastre ou consulte processos via CNJ/DataJud para alimentar a inteligência."
                  : "Sua carteira já pode alimentar indicadores executivos.",
                (stats?.total || 0) < 5
                  ? "Gere mais análises para melhorar histórico e comparação estratégica."
                  : "Você já possui histórico inicial para tomada de decisão.",
                "Use Board Report para comunicar riscos a sócios e clientes.",
                "Use o plano Enterprise para liberar estratégia, agenda e alertas.",
              ]}
            />
          </Card>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <h2 className="text-xl font-bold mb-4">Carteira recente</h2>

          {processes.length === 0 ? (
            <p className="text-muted-foreground">
              Nenhum processo monitorado ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {processes.slice(0, 8).map((item) => (
                <div key={item.id} className="rounded-xl bg-black/20 border border-white/5 p-4">
                  <p className="font-bold">{item.process_number || item.numero || "Processo"}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {item.tribunal || "-"} · {item.classe || "-"} · {item.assunto || "-"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function Metric({ title, value, color = "", icon }: any) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className={color}>{icon}</div>
      <p className="text-sm text-muted-foreground mt-3">{title}</p>
      <h2 className={`text-3xl font-bold mt-1 ${color}`}>{value}</h2>
    </div>
  )
}

function Card({ title, icon, children }: any) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="font-bold text-xl">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3 text-gray-300">
      {items.map((item, index) => (
        <li key={index}>➜ {item}</li>
      ))}
    </ul>
  )
}
