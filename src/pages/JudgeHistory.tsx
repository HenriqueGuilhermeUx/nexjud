import { useEffect, useState } from "react"
import { Gavel, Trash2, ChevronDown, ChevronUp } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { deleteJudgeSession, getJudgeSessions } from "@/services/judgeSessionService"

export default function JudgeHistory() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [user])

  async function load() {
    if (!user?.id) return

    setLoading(true)
    const data = await getJudgeSessions(user.id)
    setSessions(data)
    setLoading(false)
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta sessão?")) return

    await deleteJudgeSession(id)
    setSessions((prev) => prev.filter((item) => item.id !== id))
  }

  if (loading) {
    return <div className="p-6">Carregando sessões...</div>
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-6">
        <div>
          <h1 className="text-4xl font-bold">Histórico Judge Simulator</h1>
          <p className="text-muted-foreground mt-2">
            Acompanhe seus treinos, notas e pontos fracos em simulações com juiz.
          </p>
        </div>

        {sessions.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
            Nenhuma sessão salva ainda.
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((item) => {
              const isOpen = openId === item.id
              const history = Array.isArray(item.history) ? item.history : []

              return (
                <div key={item.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Gavel className="text-yellow-400" />
                        <h2 className="font-bold text-lg">
                          {item.title || "Sessão Judge Simulator"}
                        </h2>
                      </div>

                      <p className="text-xs text-muted-foreground mt-2">
                        {item.hearing_type || "-"} • {item.difficulty || "-"} •{" "}
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString("pt-BR")
                          : "-"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <div className="px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 font-bold">
                        Nota: {item.last_score || 0}/100
                      </div>

                      <button
                        onClick={() => setOpenId(isOpen ? null : item.id)}
                        className="px-4 py-2 rounded-xl bg-primary text-white font-semibold flex items-center gap-2"
                      >
                        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        {isOpen ? "Fechar" : "Abrir"}
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

                  {isOpen && (
                    <div className="mt-5 space-y-4 border-t border-border pt-5">
                      <div className="rounded-xl bg-background/50 border border-border p-4">
                        <p className="text-sm text-muted-foreground mb-2">Caso-base</p>
                        <p className="text-gray-300 whitespace-pre-line">
                          {item.case_text || "-"}
                        </p>
                      </div>

                      {history.map((h: any, index: number) => (
                        <div
                          key={index}
                          className={`rounded-xl border p-4 ${
                            h.type === "lawyer"
                              ? "bg-primary/10 border-primary/20"
                              : "bg-yellow-500/10 border-yellow-500/20"
                          }`}
                        >
                          <p className="text-xs text-muted-foreground mb-2">
                            {h.type === "lawyer" ? "Advogado" : "Juiz"}
                          </p>

                          <p className="text-gray-200 whitespace-pre-line">
                            {h.content}
                          </p>

                          {h.meta && (
                            <div className="mt-4 grid md:grid-cols-3 gap-3 text-sm">
                              <Info label="Nota" value={`${h.meta.performanceScore || 0}/100`} />
                              <Info label="Fragilidade" value={h.meta.detectedWeakness || "-"} />
                              <Info label="Fundamento exigido" value={h.meta.requestedFoundation || "-"} />
                            </div>
                          )}
                        </div>
                      ))}
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/20 border border-white/5 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-bold text-gray-200">{value}</p>
    </div>
  )
}
