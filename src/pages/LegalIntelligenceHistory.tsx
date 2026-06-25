import { useEffect, useState } from "react"
import { Brain, FileText, Download, Trash2, Copy } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { getLegalIntelligenceReports } from "@/services/legalIntelligenceReportService"
import { generateLegalIntelligencePdf } from "@/services/legalIntelligencePdf"
import { supabase } from "@/lib/supabase"

export default function LegalIntelligenceHistory() {
  const { user } = useAuth()

  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [user])

  async function load() {
    if (!user?.id) return

    setLoading(true)

    try {
      const data = await getLegalIntelligenceReports(user.id)
      setReports(data || [])
    } catch (error) {
      console.error(error)
      alert("Erro ao carregar histórico.")
    } finally {
      setLoading(false)
    }
  }

  async function remove(id: string) {
    if (!confirm("Excluir este relatório?")) return

    const { error } = await supabase
      .from("legal_intelligence_reports")
      .delete()
      .eq("id", id)

    if (error) {
      console.error(error)
      alert("Erro ao excluir relatório.")
      return
    }

    setReports((prev) => prev.filter((item) => item.id !== id))
  }

  function copyReport(item: any) {
    const result = item.result || {}

    const text = `
LEGAL INTELLIGENCE ENGINE — NEXJUD

${item.title || "Relatório"}

Resumo:
${result.strategic?.executiveSummary || result.boardReport?.executiveSummary || "-"}

Chance:
${result.strategic?.successProbability || 0}%

Risco:
${result.strategic?.riskLevel || result.boardReport?.riskLevel || "-"}

Decisão:
${result.strategic?.partnerDecision || result.boardReport?.decision || "-"}
`.trim()

    navigator.clipboard.writeText(text)
    alert("Relatório copiado.")
  }

  if (loading) {
    return <div className="p-6">Carregando histórico Legal Intelligence...</div>
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
        <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-indigo-500/10 to-[#05050a] p-8 shadow-2xl">
          <div className="flex items-center gap-3">
            <Brain className="text-primary" size={40} />
            <div>
              <h1 className="text-4xl font-bold">Histórico Legal Intelligence™</h1>
              <p className="text-muted-foreground mt-1">
                Relatórios consolidados salvos pelo motor central do NexJud.
              </p>
            </div>
          </div>
        </section>

        {reports.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
            Nenhum relatório salvo ainda.
          </div>
        ) : (
          <section className="space-y-4">
            {reports.map((item) => {
              const result = item.result || {}
              const strategic = result.strategic || {}
              const board = result.boardReport || {}

              return (
                <div key={item.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <FileText className="text-primary" />
                        <h2 className="font-bold text-xl">
                          {item.title || "Legal Intelligence Report"}
                        </h2>
                      </div>

                      <p className="text-xs text-muted-foreground mt-2">
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString("pt-BR")
                          : "-"}
                      </p>

                      <p className="text-gray-400 mt-3 line-clamp-3">
                        {strategic.executiveSummary || board.executiveSummary || "-"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => copyReport(item)}
                        className="px-4 py-2 rounded-xl bg-[#171721] border border-border font-semibold flex items-center gap-2"
                      >
                        <Copy size={16} />
                        Copiar
                      </button>

                      <button
                        onClick={() => generateLegalIntelligencePdf(item)}
                        className="px-4 py-2 rounded-xl bg-primary text-white font-semibold flex items-center gap-2"
                      >
                        <Download size={16} />
                        PDF
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

                  <div className="grid md:grid-cols-4 gap-3 mt-5">
                    <MiniBox label="Chance" value={`${strategic.successProbability || 0}%`} />
                    <MiniBox label="Risco" value={strategic.riskLevel || board.riskLevel || "-"} />
                    <MiniBox label="Decisão" value={strategic.partnerDecision || board.decision || "-"} />
                    <MiniBox label="Adversário" value={item.opponent_name || "-"} />
                  </div>
                </div>
              )
            })}
          </section>
        )}
      </div>
    </div>
  )
}

function MiniBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/20 border border-white/5 p-4">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-lg font-bold text-gray-200">{value}</p>
    </div>
  )
}
