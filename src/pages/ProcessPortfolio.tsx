import { useEffect, useState } from "react"
import {
  Database,
  FileText,
  TrendingUp,
  AlertTriangle,
  RefreshCcw,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { getUserProcesses } from "@/services/processIntelligenceService"

export default function ProcessPortfolio() {
  const { user } = useAuth()
  const [processes, setProcesses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [user])

  async function load() {
    if (!user?.id) return

    setLoading(true)

    try {
      const data = await getUserProcesses(user.id)
      setProcesses(data || [])
    } catch (error) {
      console.error(error)
      alert("Erro ao carregar carteira de processos.")
    } finally {
      setLoading(false)
    }
  }

  const total = processes.length
  const tribunais = new Set(processes.map((p) => p.tribunal).filter(Boolean)).size
  const classes = new Set(processes.map((p) => p.classe).filter(Boolean)).size
  const recentes = processes.filter((p) => {
    if (!p.created_at) return false
    const diff = Date.now() - new Date(p.created_at).getTime()
    return diff <= 1000 * 60 * 60 * 24 * 7
  }).length

  if (loading) {
    return <div className="p-6">Carregando carteira de processos...</div>
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
        <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 to-indigo-500/10 p-8">
          <div className="flex items-center gap-3 mb-4">
            <Database className="text-primary" size={36} />
            <div>
              <h1 className="text-4xl font-bold">Carteira de Processos™</h1>
              <p className="text-muted-foreground mt-1">
                Inteligência processual oficial consolidada a partir do CNJ/DataJud.
              </p>
            </div>
          </div>
        </section>

        <section className="grid md:grid-cols-4 gap-4">
          <Metric title="Processos monitorados" value={String(total)} color="text-primary" />
          <Metric title="Tribunais" value={String(tribunais)} />
          <Metric title="Classes processuais" value={String(classes)} />
          <Metric title="Consultas recentes" value={String(recentes)} color="text-green-400" />
        </section>

        {processes.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
            Nenhum processo consultado ainda. Busque um CNJ no Strategic Analysis para alimentar esta carteira.
          </div>
        ) : (
          <div className="space-y-4">
            {processes.map((item) => {
              const movements = item.dados?.process?.movements || []

              return (
                <div key={item.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <FileText className="text-primary" />
                        <h2 className="font-bold text-lg">
                          {item.process_number || "Processo sem número"}
                        </h2>
                      </div>

                      <p className="text-sm text-muted-foreground mt-2">
                        {item.tribunal || "-"} • {item.orgao_julgador || "-"}
                      </p>

                      <p className="text-sm text-muted-foreground mt-1">
                        {item.classe || "-"} • {item.assunto || "-"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <SmallBadge
                        icon={<TrendingUp size={14} />}
                        label="Andamentos"
                        value={String(movements.length || 0)}
                      />

                      <SmallBadge
                        icon={<RefreshCcw size={14} />}
                        label="Consultado"
                        value={
                          item.created_at
                            ? new Date(item.created_at).toLocaleDateString("pt-BR")
                            : "-"
                        }
                      />
                    </div>
                  </div>

                  <div className="mt-5 rounded-xl bg-black/20 border border-white/5 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="text-yellow-400" size={18} />
                      <h3 className="font-bold">Última movimentação</h3>
                    </div>

                    <p className="text-gray-300">
                      {item.ultima_movimentacao || "Sem movimentação identificada."}
                    </p>
                  </div>

                  {movements.length > 0 && (
                    <div className="mt-5">
                      <h3 className="font-bold mb-3">Linha do tempo oficial</h3>

                      <div className="space-y-3">
                        {movements.slice(0, 8).map((m: any, index: number) => (
                          <div
                            key={index}
                            className="rounded-xl bg-black/20 border border-white/5 p-4"
                          >
                            <p className="text-xs text-primary font-bold">
                              {m.date
                                ? new Date(m.date).toLocaleDateString("pt-BR")
                                : "-"}
                            </p>
                            <p className="font-semibold mt-1">{m.name}</p>
                            {m.complement && (
                              <p className="text-sm text-gray-400 mt-1">
                                {typeof m.complement === "string"
                                  ? m.complement
                                  : JSON.stringify(m.complement)}
                              </p>
                            )}
                          </div>
                        ))}
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

function SmallBadge({
  icon,
  label,
  value,
}: {
  icon: any
  label: string
  value: string
}) {
  return (
    <div className="rounded-xl bg-black/20 border border-white/5 px-4 py-3">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        {icon}
        {label}
      </div>
      <p className="font-bold mt-1">{value}</p>
    </div>
  )
}
