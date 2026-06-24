import { useEffect, useState } from "react"
import {
  Brain,
  Trash2,
  ChevronDown,
  ChevronUp,
  Copy,
  TrendingUp,
  Scale,
  ShieldAlert,
  FileText,
  Sparkles,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import {
  getUserAnalyses,
  deleteAnalysis,
} from "@/services/strategicAnalysisService"

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

    try {
      const data = await getUserAnalyses(user.id)
      setAnalyses(data || [])
    } catch (error) {
      console.error(error)
      alert("Erro ao carregar histórico.")
    } finally {
      setLoading(false)
    }
  }

  async function remove(id: string) {
    if (!confirm("Excluir esta análise?")) return

    await deleteAnalysis(id)
    setAnalyses((prev) => prev.filter((item) => item.id !== id))
  }

  function copyAnalysis(item: any) {
    const text = `
${item.title || "Análise Estratégica NexJud"}

Resumo:
${item.case_text || "-"}

Chance:
${item.success_probability || 0}%

Risco:
${item.risk_level || "-"}

Potencial:
${item.financial_potential || "-"}

Decisão Sócio IA:
${item.partner_decision || "-"}

Deal Breakers:
${(item.deal_breakers || []).map((x: string) => `- ${x}`).join("\n")}

Red Team:
${(item.red_team || []).map((x: string) => `- ${x}`).join("\n")}

Strategy Engine:
${(item.strategy_engine || []).map((x: string) => `- ${x}`).join("\n")}
`

    navigator.clipboard.writeText(text)
    alert("Análise copiada.")
  }

  if (loading) {
    return <div className="p-6">Carregando histórico estratégico...</div>
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-6">
        <div>
          <h1 className="text-4xl font-bold">Histórico Estratégico 2.0</h1>
          <p className="text-muted-foreground mt-2">
            Reabra análises completas com Jurisprudência Preditiva, War Room,
            Financial Exposure, Auditoria, Due Diligence e Legal Command Center.
          </p>
        </div>

        {analyses.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-muted-foreground">
            Nenhuma análise salva ainda.
          </div>
        ) : (
          <div className="space-y-4">
            {analyses.map((item) => {
              const isOpen = openId === item.id

              return (
                <div
                  key={item.id}
                  className="rounded-2xl border border-border bg-card p-5"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Brain className="text-primary" />
                        <h2 className="font-bold text-lg">
                          {item.title || "Análise Estratégica"}
                        </h2>
                      </div>

                      <p className="text-xs text-muted-foreground mt-2">
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString("pt-BR")
                          : "-"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Badge label="Chance" value={`${item.success_probability || 0}%`} />
                      <Badge label="Risco" value={item.risk_level || "-"} />
                      <Badge label="Sócio IA" value={item.partner_decision || "-"} />

                      <button
                        onClick={() => setOpenId(isOpen ? null : item.id)}
                        className="px-4 py-2 rounded-xl bg-primary text-white font-semibold flex items-center gap-2"
                      >
                        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        {isOpen ? "Fechar" : "Abrir"}
                      </button>

                      <button
                        onClick={() => copyAnalysis(item)}
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

                  {isOpen && (
                    <div className="mt-6 space-y-6 border-t border-border pt-6">
                      <Card title="Resumo do Caso" icon={<FileText className="text-primary" />}>
                        <p className="text-gray-300 whitespace-pre-line">
                          {item.case_text || "-"}
                        </p>
                      </Card>

                      <section className="grid md:grid-cols-4 gap-4">
                        <Metric title="Chance de êxito" value={`${item.success_probability || 0}%`} color="text-green-400" />
                        <Metric title="Risco" value={item.risk_level || "-"} color="text-yellow-400" />
                        <Metric title="Potencial" value={item.financial_potential || "-"} color="text-primary" />
                        <Metric title="Decisão" value={item.partner_decision || "-"} color="text-green-400" />
                      </section>

                      <section className="grid lg:grid-cols-2 gap-6">
                        <Card title="Deal Breakers™" icon={<ShieldAlert className="text-red-400" />} danger>
                          <List items={item.deal_breakers} prefix="❌" />
                        </Card>

                        <Card title="Red Team™" icon={<ShieldAlert className="text-red-400" />}>
                          <List items={item.red_team} prefix="⚔️" />
                        </Card>
                      </section>

                      <Card title="Strategy Engine™" icon={<Sparkles className="text-primary" />} highlight>
                        <List items={item.strategy_engine} prefix="✓" />
                      </Card>

                      <section className="grid lg:grid-cols-2 gap-6">
                        <Card title="Jurisprudência Preditiva™" icon={<TrendingUp className="text-primary" />} highlight>
                          <Metric
                            title="Tendência estimada"
                            value={`${item.jurisprudence_prediction?.favorableRate || 0}% favorável`}
                            color="text-green-400"
                          />
                          <p className="text-gray-300 mt-4">
                            {item.jurisprudence_prediction?.thesisStrength || "-"}
                          </p>
                          <List title="Fatores favoráveis" items={item.jurisprudence_prediction?.favorableFactors} prefix="✓" />
                          <List title="Fatores desfavoráveis" items={item.jurisprudence_prediction?.unfavorableFactors} prefix="⚠️" />
                        </Card>

                        <Card title="Financial Exposure™" icon={<Scale className="text-yellow-400" />} warning>
                          <section className="grid md:grid-cols-3 gap-3">
                            <Metric title="Melhor" value={item.financial_exposure?.bestCase || "-"} color="text-green-400" />
                            <Metric title="Provável" value={item.financial_exposure?.probableCase || "-"} color="text-yellow-400" />
                            <Metric title="Pior" value={item.financial_exposure?.worstCase || "-"} color="text-red-400" />
                          </section>
                          <p className="text-gray-300 mt-4">
                            {item.financial_exposure?.financialRecommendation || "-"}
                          </p>
                        </Card>
                      </section>

                      <Card title="AI Partner Council™" icon={<Target className="text-primary" />} highlight>
                        <div className="grid lg:grid-cols-4 gap-4">
                          {(item.partner_council || []).map((p: any, index: number) => (
                            <div key={index} className="rounded-xl bg-black/20 border border-white/5 p-4">
                              <p className="font-bold text-primary">{p.partner}</p>
                              <p className="text-xl font-bold mt-2">{p.decision}</p>
                              <p className="text-sm text-gray-400 mt-3">{p.reason}</p>
                            </div>
                          ))}
                        </div>
                      </Card>

                      <Card title="Litigation War Room™" icon={<ShieldAlert className="text-red-400" />} danger>
                        <div className="grid lg:grid-cols-5 gap-4">
                          <List title="Ataque" items={item.war_room?.attackPlan} prefix="⚔️" />
                          <List title="Defesa" items={item.war_room?.defensePlan} prefix="🛡️" />
                          <List title="Provas" items={item.war_room?.evidencePlan} prefix="📎" />
                          <List title="Negociação" items={item.war_room?.negotiationPlan} prefix="🤝" />
                          <List title="Urgente" items={item.war_room?.emergencyActions} prefix="🚨" />
                        </div>
                      </Card>

                      <section className="grid lg:grid-cols-2 gap-6">
                        <Card title="Tribunal DNA™" icon={<Scale className="text-primary" />}>
                          <Metric title="Perfil" value={item.tribunal_dna?.profile || "-"} color="text-primary" />
                          <List title="Valoriza" items={item.tribunal_dna?.values} prefix="✓" />
                          <List title="Rejeita" items={item.tribunal_dna?.rejects} prefix="✗" />
                          <p className="text-gray-300 mt-4">
                            {item.tribunal_dna?.strategicAdvice || "-"}
                          </p>
                        </Card>

                        <Card title="Case Timeline™" icon={<TrendingUp className="text-primary" />}>
                          <div className="space-y-3">
                            {(item.case_timeline || []).map((t: any, index: number) => (
                              <div key={index} className="rounded-xl bg-black/20 border border-white/5 p-4">
                                <p className="text-sm text-primary font-bold">{t.date}</p>
                                <p className="font-semibold mt-1">{t.event}</p>
                                <p className="text-sm text-gray-400 mt-1">{t.impact}</p>
                              </div>
                            ))}
                          </div>
                        </Card>
                      </section>

                      <section className="grid lg:grid-cols-2 gap-6">
                        <Card title="Auditor Jurídico™" icon={<AlertTriangle className="text-red-400" />} danger>
                          <Metric title="Audit Score" value={`${item.auditor_findings?.auditScore || 0}/100`} color="text-yellow-400" />
                          <List title="Riscos críticos" items={item.auditor_findings?.criticalRisks} prefix="🚨" />
                          <List title="Inconsistências" items={item.auditor_findings?.inconsistencies} prefix="⚠️" />
                          <List title="Documentos ausentes" items={item.auditor_findings?.missingDocuments} prefix="📄" />
                          <List title="Passivos ocultos" items={item.auditor_findings?.hiddenLiabilities} prefix="💣" />
                        </Card>

                        <Card title="Due Diligence IA™" icon={<FileText className="text-primary" />}>
                          <section className="grid md:grid-cols-2 gap-3">
                            <Metric title="Score" value={`${item.due_diligence?.score || 0}/100`} color="text-green-400" />
                            <Metric title="Risco" value={item.due_diligence?.riskLevel || "-"} color="text-yellow-400" />
                          </section>
                          <List title="Achados" items={item.due_diligence?.keyFindings} prefix="✓" />
                          <List title="Bloqueadores" items={item.due_diligence?.blockers} prefix="⛔" />
                          <p className="text-gray-300 mt-4">
                            {item.due_diligence?.recommendation || "-"}
                          </p>
                        </Card>
                      </section>

                      <Card title="Legal Command Center™" icon={<Sparkles className="text-primary" />} highlight>
                        <section className="grid md:grid-cols-4 gap-4">
                          <Metric title="Risco geral" value={item.legal_command_center?.overallRisk || "-"} />
                          <Metric title="Prioridade" value={item.legal_command_center?.priority || "-"} color="text-yellow-400" />
                          <Metric title="Ação agora" value={item.legal_command_center?.actionNow || "-"} />
                          <Metric title="Decisão" value={item.legal_command_center?.executiveDecision || "-"} color="text-primary" />
                        </section>
                        <p className="text-gray-300 mt-4">
                          {item.legal_command_center?.boardSummary || "-"}
                        </p>
                      </Card>
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

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-2 rounded-xl bg-black/20 border border-white/5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  )
}

function Metric({ title, value, color = "" }: { title: string; value: string; color?: string }) {
  return (
    <div className="rounded-xl bg-black/20 border border-white/5 p-4">
      <p className="text-xs text-gray-400">{title}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

function Card({ title, icon, children, danger, highlight, warning }: any) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        highlight
          ? "bg-gradient-to-r from-primary/10 to-indigo-500/10 border-primary/30"
          : danger
          ? "bg-[#111118] border-red-900/70"
          : warning
          ? "bg-[#111118] border-yellow-900/70"
          : "bg-[#111118] border-[#2a2a35]"
      }`}
    >
      <div className={`flex items-center gap-2 mb-4 ${danger ? "text-red-400" : warning ? "text-yellow-400" : ""}`}>
        {icon}
        <h3 className="font-bold text-xl">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function List({
  title,
  items,
  prefix,
}: {
  title?: string
  items?: any[]
  prefix: string
}) {
  const list = Array.isArray(items) ? items : []

  return (
    <div className="mt-4">
      {title && <p className="font-bold mb-2">{title}</p>}
      {list.length === 0 ? (
        <p className="text-gray-500">Sem itens.</p>
      ) : (
        <ul className="space-y-2 text-gray-300">
          {list.map((item: any, index: number) => (
            <li key={index}>
              {prefix} {String(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
