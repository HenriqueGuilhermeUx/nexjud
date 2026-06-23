import { useEffect, useState } from "react"
import {
  Brain,
  Target,
  ShieldAlert,
  AlertTriangle,
  Scale,
  TrendingUp,
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react"

import { useAuth } from "@/context/AuthContext"
import { saveAnalysis } from "@/services/strategicAnalysisService"
import { getDashboardStats } from "@/services/dashboardService"
import { runStrategicAnalysis } from "@/services/strategicAiService"
import { generateStrategicPdf } from "@/services/pdfReport"

export default function HomeDashboard() {
  const { user } = useAuth()

  const [caseText, setCaseText] = useState("")
  const [loading, setLoading] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)

  const [stats, setStats] = useState({
    total: 0,
    avgSuccess: 0,
    accepted: 0,
    rejected: 0,
  })

  useEffect(() => {
    loadStats()
  }, [user])

  async function loadStats() {
    if (!user?.id) return

    try {
      const result = await getDashboardStats(user.id)
      setStats(result)
    } catch (err) {
      console.error(err)
    }
  }

  function normalizePercent(value: any) {
    const num = Number(value || 0)
    if (num > 0 && num <= 10) return num * 10
    if (num > 100) return 100
    return num
  }

  function buildPdfAnalysis() {
    if (!analysisResult) return null

    return {
      title: analysisResult.title || "NexJud Strategic Analysis",
      created_at: new Date().toISOString(),
      case_text: caseText,
      success_probability: analysisResult.successProbability || 0,
      risk_level: analysisResult.riskLevel || "-",
      financial_potential: analysisResult.financialPotential || "-",
      partner_decision: analysisResult.partnerDecision || "-",
      case_dna: analysisResult.caseDna || {},
      deal_breakers: analysisResult.dealBreakers || [],
      red_team: analysisResult.redTeam || [],
      strategy_engine: analysisResult.strategyEngine || [],
    }
  }

  function handleGeneratePdf() {
    const pdfData = buildPdfAnalysis()

    if (!pdfData) {
      alert("Gere uma análise primeiro.")
      return
    }

    generateStrategicPdf(pdfData)
  }

  function loadExample() {
    setCaseText(
      "Ação trabalhista. Reclamante pede reconhecimento de vínculo empregatício e horas extras. Há mensagens de WhatsApp com ordens diárias, comprovantes de pagamento recorrente, testemunhas e registros de entrada no local. A empresa alega autonomia e prestação eventual."
    )
  }

  async function handleAnalyze() {
    if (!caseText.trim()) {
      alert("Cole um caso, tese, petição ou número CNJ primeiro.")
      return
    }

    if (!user?.id) {
      alert("Faça login novamente para salvar a análise.")
      return
    }

    setLoading(true)

    try {
      const result = await runStrategicAnalysis(caseText)

      await saveAnalysis({
        userId: user.id,
        title: result.title || `Strategic Analysis ${new Date().toLocaleDateString("pt-BR")}`,
        caseText,
        successProbability: result.successProbability || 0,
        riskLevel: result.riskLevel || "-",
        financialPotential: result.financialPotential || "-",
        caseDna: result.caseDna || {},
        dealBreakers: result.dealBreakers || [],
        redTeam: result.redTeam || [],
        strategyEngine: result.strategyEngine || [],
        partnerDecision: result.partnerDecision || "-",
      })

      setAnalysisResult(result)
      await loadStats()
      alert("Análise salva no histórico.")
    } catch (error) {
      console.error(error)
      alert("Erro ao gerar/salvar análise. Verifique os logs da Edge Function strategic-analysis.")
    } finally {
      setLoading(false)
    }
  }

  const heatmap = analysisResult?.heatmap || [
    ["Força das Provas", 0],
    ["Jurisprudência Favorável", 0],
    ["Risco de Prescrição", 0],
    ["Nexo Causal", 0],
    ["Dano Moral", 0],
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
        <section className="rounded-3xl border border-[#2a2a35] bg-gradient-to-br from-[#111118] to-[#0c0c12] p-8 lg:p-10 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-5">
                <Sparkles size={16} />
                NexJud Strategic Intelligence™
              </div>

              <div className="flex items-center gap-3 mb-4">
                <Brain className="text-primary" size={38} />
                <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
                  Decida se vale entrar, negociar ou abandonar um caso.
                </h1>
              </div>

              <p className="text-gray-400 text-lg mb-6">
                Cole um resumo, tese, petição ou número CNJ. O NexJud transforma o caso em score,
                riscos, Red Team, estratégia e parecer executivo.
              </p>
            </div>

            <div className="w-full lg:w-[380px] rounded-2xl border border-primary/20 bg-primary/5 p-5">
              <p className="text-sm text-gray-400 mb-2">Diagnóstico rápido</p>

              {analysisResult ? (
                <>
                  <div className="text-5xl font-bold text-green-400">
                    {analysisResult.successProbability || 0}%
                  </div>
                  <p className="text-sm text-gray-400 mt-2">chance estratégica estimada</p>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold text-gray-300">Aguardando caso</div>
                  <p className="text-sm text-gray-400 mt-2">
                    Cole um caso para gerar seu primeiro diagnóstico.
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="mt-8">
            <textarea
              value={caseText}
              onChange={(e) => setCaseText(e.target.value)}
              placeholder="Cole aqui o processo, petição, tese, resumo dos fatos ou número CNJ..."
              className="w-full h-44 rounded-2xl bg-[#0f0f15] border border-[#2a2a35] p-5 text-base outline-none focus:border-primary"
            />

            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="px-7 py-4 rounded-2xl bg-primary text-white font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    ANALISANDO...
                  </>
                ) : (
                  <>
                    <Brain size={18} />
                    ANALISAR CASO
                  </>
                )}
              </button>

              <button
                onClick={loadExample}
                className="px-7 py-4 rounded-2xl bg-[#171721] border border-[#2a2a35] font-bold hover:bg-[#20202b]"
              >
                Exemplo de caso
              </button>
            </div>
          </div>
        </section>

        <section className="grid md:grid-cols-4 gap-4">
          <Metric title="Análises salvas" value={String(stats.total)} />
          <Metric title="Chance média" value={`${stats.avgSuccess}%`} color="text-green-400" />
          <Metric title="Casos aceitos" value={String(stats.accepted)} color="text-primary" />
          <Metric title="Casos recusados" value={String(stats.rejected)} color="text-red-400" />
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          <CardTitle icon={<TrendingUp className="text-primary" />} title="Heatmap Jurídico™">
            <div className="space-y-4">
              {heatmap.map(([label, value]: any) => {
                const normalized = normalizePercent(value)

                return (
                  <div key={label}>
                    <div className="flex justify-between mb-1">
                      <span>{label}</span>
                      <span>{normalized}%</span>
                    </div>

                    <div className="h-3 bg-[#222] rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${normalized}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardTitle>

          <CardTitle icon={<AlertTriangle />} title="Deal Breakers™" danger>
            {analysisResult ? (
              <ul className="space-y-3 text-gray-300">
                {(analysisResult.dealBreakers || []).map((item: string, index: number) => (
                  <li key={index}>❌ {item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">Os fatores críticos aparecerão aqui após a análise.</p>
            )}
          </CardTitle>
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          <CardTitle icon={<ShieldAlert className="text-red-400" />} title="Red Team™">
            {analysisResult ? (
              <div className="space-y-4">
                {(analysisResult.redTeam || []).map((item: string, index: number) => (
                  <div key={index} className="p-4 rounded-xl bg-[#0f0f15] border border-white/5">
                    <h3 className="font-bold mb-2">Ataque #{index + 1}</h3>
                    <p className="text-gray-300">{item}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">A simulação da parte contrária aparecerá aqui.</p>
            )}
          </CardTitle>

          <CardTitle icon={<Scale className="text-primary" />} title="Judge DNA™">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2 text-green-400">Valoriza</h3>
                <ul className="space-y-2">
                  {(analysisResult?.judgeDna?.valoriza || ["Documentos", "Perícia técnica", "Linha do tempo clara"]).map(
                    (item: string, index: number) => <li key={index}>✓ {item}</li>
                  )}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-2 text-red-400">Rejeita</h3>
                <ul className="space-y-2">
                  {(analysisResult?.judgeDna?.rejeita || ["Alegações genéricas", "Dano moral sem prova", "Pedidos excessivos"]).map(
                    (item: string, index: number) => <li key={index}>✗ {item}</li>
                  )}
                </ul>
              </div>
            </div>
          </CardTitle>
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          <CardTitle icon={<Target className="text-primary" />} title="Se eu fosse seu sócio™" highlight>
            <h3 className="text-3xl font-bold text-green-400 mb-3">
              {analysisResult?.partnerDecision || "-"}
            </h3>
            <p className="text-gray-300">
              {analysisResult?.partnerReason || "A decisão estratégica aparecerá aqui após a análise."}
            </p>
          </CardTitle>

          <CardTitle icon={<FileText className="text-primary" />} title="Strategy Engine™">
            {analysisResult ? (
              <ul className="space-y-3 text-gray-300">
                {(analysisResult.strategyEngine || []).map((item: string, index: number) => (
                  <li key={index}>✓ {item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">O plano de ação recomendado aparecerá aqui.</p>
            )}
          </CardTitle>
        </section>

        {analysisResult && (
          <button
            onClick={handleGeneratePdf}
            className="w-full py-5 rounded-2xl bg-primary font-bold text-lg hover:opacity-90"
          >
            <FileText className="inline mr-2" />
            GERAR RELATÓRIO EXECUTIVO
          </button>
        )}
      </div>
    </div>
  )
}

function Metric({ title, value, color = "" }: { title: string; value: string; color?: string }) {
  return (
    <div className="bg-[#111118] rounded-2xl p-5 border border-[#2a2a35]">
      <p className="text-sm text-gray-400">{title}</p>
      <h2 className={`text-3xl font-bold ${color}`}>{value}</h2>
    </div>
  )
}

function CardTitle({ icon, title, children, danger, highlight }: any) {
  return (
    <div
      className={`rounded-2xl border p-6 ${
        highlight
          ? "bg-gradient-to-r from-primary/10 to-indigo-500/10 border-primary/30"
          : danger
          ? "bg-[#111118] border-red-900/70"
          : "bg-[#111118] border-[#2a2a35]"
      }`}
    >
      <div className={`flex items-center gap-2 mb-4 ${danger ? "text-red-400" : ""}`}>
        {icon}
        <h2 className="font-bold text-xl">{title}</h2>
      </div>
      {children}
    </div>
  )
}
