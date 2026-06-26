import { useEffect, useState } from "react"
import { Brain, Copy, Trash2, Search, FileText } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import {
  getCopilotSessions,
  deleteCopilotSession,
} from "@/services/copilotSessionService"

export default function AICopilotHistory() {
  const { user } = useAuth()

  const [sessions, setSessions] = useState<any[]>([])
  const [filtered, setFiltered] = useState<any[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => {
    load()
  }, [user])

  useEffect(() => {
    const q = query.toLowerCase().trim()

    if (!q) {
      setFiltered(sessions)
      return
    }

    setFiltered(
      sessions.filter((item) =>
        JSON.stringify(item).toLowerCase().includes(q)
      )
    )
  }, [query, sessions])

  async function load() {
    if (!user?.id) return

    setLoading(true)

    try {
      const data = await getCopilotSessions(user.id)
      setSessions(data || [])
      setFiltered(data || [])
    } catch (error) {
      console.error(error)
      alert("Erro ao carregar histórico do Copilot.")
    } finally {
      setLoading(false)
    }
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta análise do Copilot?")) return

    try {
      await deleteCopilotSession(id)
      setSessions((prev) => prev.filter((item) => item.id !== id))
      setSelected(null)
    } catch (error) {
      console.error(error)
      alert("Erro ao excluir análise.")
    }
  }

  function copy(item: any) {
    const text = buildText(item)
    navigator.clipboard.writeText(text)
    alert("Análise copiada.")
  }

  if (loading) {
    return <div className="p-6">Carregando histórico do AI Copilot...</div>
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
        <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-indigo-500/10 to-[#05050a] p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="text-primary" size={44} />
            <div>
              <h1 className="text-4xl font-bold">Histórico AI Copilot™</h1>
              <p className="text-muted-foreground mt-1">
                Todas as análises completas geradas pelo Copilot.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <Search className="text-primary" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar por cliente, adversário, risco, tese..."
              className="w-full bg-transparent outline-none"
            />
          </div>
        </section>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
            Nenhuma análise do Copilot encontrada.
          </div>
        ) : (
          <section className="grid lg:grid-cols-2 gap-5">
            <div className="space-y-4">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-border bg-card p-5 hover:border-primary/40 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <FileText className="text-primary" />
                        <h2 className="font-bold text-lg">
                          {item.result?.executive?.title || "AI Copilot Report"}
                        </h2>
                      </div>

                      <p className="text-xs text-muted-foreground mt-2">
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString("pt-BR")
                          : "-"}
                      </p>

                      <p className="text-gray-400 mt-3 line-clamp-3">
                        {item.executive_summary || item.prompt || "-"}
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-4 gap-3 mt-5">
                    <MiniBox label="Chance" value={`${item.success_probability || 0}%`} />
                    <MiniBox label="Risco" value={item.risk_level || "-"} />
                    <MiniBox label="Decisão" value={item.decision || "-"} />
                    <MiniBox label="Próximo" value={item.next_move ? "Definido" : "-"} />
                  </div>

                  <div className="flex flex-wrap gap-3 mt-5">
                    <button
                      onClick={() => setSelected(item)}
                      className="px-4 py-2 rounded-xl bg-primary text-white font-semibold"
                    >
                      Reabrir
                    </button>

                    <button
                      onClick={() => copy(item)}
                      className="px-4 py-2 rounded-xl bg-[#171721] border border-border font-semibold flex items-center gap-2"
                    >
                      <Copy size={16} />
                      Copiar
                    </button>

                    <button
                      onClick={() => remove(item.id)}
                      className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-semibold flex items-center gap-2"
                    >
                      <Trash2 size={16} />
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 h-fit sticky top-6">
              {selected ? (
                <>
                  <h2 className="text-2xl font-bold mb-4">
                    {selected.result?.executive?.title || "Relatório Copilot"}
                  </h2>

                  <pre className="whitespace-pre-wrap text-sm text-gray-300 overflow-auto max-h-[720px]">
                    {buildText(selected)}
                  </pre>
                </>
              ) : (
                <p className="text-muted-foreground">
                  Clique em “Reabrir” para visualizar uma análise.
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

function buildText(item: any) {
  const result = item.result || {}

  return `
AI LEGAL COPILOT — NEXJUD

Data:
${item.created_at ? new Date(item.created_at).toLocaleString("pt-BR") : "-"}

Caso:
${item.prompt || "-"}

Resumo Executivo:
${item.executive_summary || result.executive?.summary || "-"}

Chance:
${item.success_probability || result.executive?.successProbability || 0}%

Risco:
${item.risk_level || result.executive?.riskLevel || "-"}

Decisão:
${item.decision || result.executive?.decision || "-"}

Próximo Movimento:
${item.next_move || result.executive?.nextMove || "-"}

Strategic Analysis:
${result.strategic?.executiveSummary || "-"}

Litigation Strategy:
${result.litigation?.diagnosis || "-"}

War Room:
${[
  ...(result.warRoom?.attackPlan || []),
  ...(result.warRoom?.defensePlan || []),
  ...(result.warRoom?.emergencyActions || []),
]
  .map((x: string) => `- ${x}`)
  .join("\n")}

Board Report:
${result.boardReport?.executiveSummary || result.boardReport?.partnerBriefing || "-"}
`.trim()
}

function MiniBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/20 border border-white/5 p-3">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="font-bold text-gray-200 truncate">{value}</p>
    </div>
  )
}
