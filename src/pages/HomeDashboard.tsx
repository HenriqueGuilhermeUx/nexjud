import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
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
  Wand2,
  Search,
  Database,
} from "lucide-react"

import { useAuth } from "@/context/AuthContext"
import { saveAnalysis } from "@/services/strategicAnalysisService"
import { getDashboardStats } from "@/services/dashboardService"
import { runStrategicAnalysis } from "@/services/strategicAiService"
import { generateStrategicPdf } from "@/services/pdfReport"
import {
  searchProcessDatajud,
  buildCaseTextFromDatajud,
  formatCnj,
  detectTribunalAliasFromCnj,
} from "@/services/datajudService"

export default function HomeDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [caseText, setCaseText] = useState("")
  const [cnjNumber, setCnjNumber] = useState("")
  const [tribunalAlias, setTribunalAlias] = useState("")
  const [datajudLoading, setDatajudLoading] = useState(false)
  const [datajudProcess, setDatajudProcess] = useState<any>(null)

  const [loading, setLoading] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)

  const [stats, setStats] = useState({
    total: 0,
    avgSuccess: 0,
    accepted: 0,
    rejected: 0,
    draftsTotal: 0,
    judgeTotal: 0,
    avgJudgeScore: 0,
    latestActivities: [] as any[],
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

  async function handleDatajudSearch() {
    if (!cnjNumber.trim()) {
      alert("Informe o número CNJ.")
      return
    }

    setDatajudLoading(true)

    try {
      const alias = tribunalAlias || detectTribunalAliasFromCnj(cnjNumber)
      const result = await searchProcessDatajud(cnjNumber, alias)

      if (!result.found || !result.process) {
        alert("Processo não encontrado no DataJud para este tribunal.")
        return
      }

      setDatajudProcess(result.process)

      const generatedText = buildCaseTextFromDatajud(result.process)
      setCaseText(generatedText)

      alert("Processo localizado. Os dados reais foram inseridos no caso.")
    } catch (error) {
      console.error(error)
      alert("Erro ao consultar DataJud. Verifique o CNJ, tribunal e Edge Function.")
    } finally {
      setDatajudLoading(false)
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

      jurisprudence_prediction: analysisResult.jurisprudencePrediction || {},
      financial_exposure: analysisResult.financialExposure || {},
      partner_council: analysisResult.partnerCouncil || [],
      war_room: analysisResult.warRoom || {},
      case_timeline: analysisResult.caseTimeline || [],
      tribunal_dna: analysisResult.tribunalDna || {},
      auditor_findings: analysisResult.auditorFindings || {},
      due_diligence: analysisResult.dueDiligence || {},
      legal_command_center: analysisResult.legalCommandCenter || {},

      one_click_actions: analysisResult.oneClickActions || [],
      deal_economics: analysisResult.dealEconomics || {},
      client_risk: analysisResult.clientRisk || {},
      opponent_intelligence: analysisResult.opponentIntelligence || {},
      board_report: analysisResult.boardReport || {},
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

  function handleGenerateDraftFromAnalysis() {
    if (!analysisResult) {
      alert("Gere uma análise primeiro.")
      return
    }

    localStorage.setItem(
      "nexjud_draft_context",
      JSON.stringify({
        caseText,
        focus: [
          analysisResult.executiveSummary,
          analysisResult.winningThesis,
          analysisResult.defenseThesis,
          analysisResult.settlementRecommendation,
          analysisResult.jurisprudencePrediction?.thesisStrength,
          analysisResult.financialExposure?.financialRecommendation,
          analysisResult.dealEconomics?.reason,
          analysisResult.clientRisk?.recommendation,
          analysisResult.opponentIntelligence?.profile,
          ...(analysisResult.dealBreakers || []),
          ...(analysisResult.redTeam || []),
          ...(analysisResult.strategyEngine || []),
          ...(analysisResult.nextMoves || []),
        ]
          .filter(Boolean)
          .join("\n"),
      })
    )

    navigate("/dashboard/draft-generator")
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
      const enrichedCaseText = datajudProcess
        ? `${caseText}

DADOS DATAJUD OFICIAIS:
Processo: ${datajudProcess.number}
Tribunal: ${datajudProcess.court}
Unidade: ${datajudProcess.courtUnit}
Classe: ${datajudProcess.className}
Assunto: ${datajudProcess.subject}`
        : caseText

      const result = await runStrategicAnalysis(enrichedCaseText)

      await saveAnalysis({
        userId: user.id,
        title: result.title || `Strategic Analysis ${new Date().toLocaleDateString("pt-BR")}`,
        caseText: enrichedCaseText,
        successProbability: result.successProbability || 0,
        riskLevel: result.riskLevel || "-",
        financialPotential: result.financialPotential || "-",
        caseDna: result.caseDna || {},
        dealBreakers: result.dealBreakers || [],
        redTeam: result.redTeam || [],
        strategyEngine: result.strategyEngine || [],
        partnerDecision: result.partnerDecision || "-",

        jurisprudencePrediction: result.jurisprudencePrediction || {},
        financialExposure: result.financialExposure || {},
        partnerCouncil: result.partnerCouncil || [],
        warRoom: result.warRoom || {},
        caseTimeline: result.caseTimeline || [],
        tribunalDna: result.tribunalDna || {},
        auditorFindings: result.auditorFindings || {},
        dueDiligence: result.dueDiligence || {},
        legalCommandCenter: result.legalCommandCenter || {},

        oneClickActions: result.oneClickActions || [],
        dealEconomics: result.dealEconomics || {},
        clientRisk: result.clientRisk || {},
        opponentIntelligence: result.opponentIntelligence || {},
        boardReport: result.boardReport || {},
      })

      setAnalysisResult(result)
      await loadStats()
      alert("Análise completa salva no histórico.")
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
        <section className="rounded-3xl border border-[#2a2a35] bg-gradient-to-br from-[#111118] via-[#0d0d15] to-[#05050a] p-8 lg:p-10 shadow-2xl">
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
                riscos, jurisprudência preditiva, exposição financeira, War Room, auditoria e parecer executivo.
              </p>

              <div className="grid sm:grid-cols-3 gap-3 text-sm text-gray-300">
                <Badge text="DataJud/CNJ Oficial™" />
                <Badge text="Jurisprudência Preditiva™" />
                <Badge text="Financial Exposure™" />
                <Badge text="Deal Economics™" />
                <Badge text="Opponent Intelligence™" />
                <Badge text="Board Report™" />
              </div>
            </div>

            <div className="w-full lg:w-[380px] rounded-2xl border border-primary/20 bg-primary/5 p-5">
              <p className="text-sm text-gray-400 mb-2">Diagnóstico rápido</p>

              {analysisResult ? (
                <>
                  <div className="text-5xl font-bold text-green-400">
                    {analysisResult.successProbability || 0}%
                  </div>
                  <p className="text-sm text-gray-400 mt-2">chance estratégica estimada</p>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <MiniBox label="Risco" value={analysisResult.riskLevel || "-"} />
                    <MiniBox label="Prioridade" value={analysisResult.legalCommandCenter?.priority || "-"} />
                  </div>
                </>
              ) : (
                <>
                  <div className="text-2xl font-bold text-gray-300">Aguardando caso</div>
                  <p className="text-sm text-gray-400 mt-2">
                    Cole um caso ou busque pelo CNJ para gerar o diagnóstico.
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Database className="text-primary" />
              <h2 className="font-bold text-xl">CNJ Process Intelligence™</h2>
            </div>

            <div className="grid lg:grid-cols-4 gap-3">
              <input
                value={cnjNumber}
                onChange={(e) => setCnjNumber(formatCnj(e.target.value))}
                placeholder="Número CNJ"
                className="lg:col-span-2 rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4 outline-none focus:border-primary"
              />

              <input
                value={tribunalAlias}
                onChange={(e) => setTribunalAlias(e.target.value.toLowerCase())}
                placeholder="Alias opcional: tjsp, trt2, trf3..."
                className="rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4 outline-none focus:border-primary"
              />

              <button
                onClick={handleDatajudSearch}
                disabled={datajudLoading}
                className="rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {datajudLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    BUSCANDO...
                  </>
                ) : (
                  <>
                    <Search size={18} />
                    BUSCAR CNJ
                  </>
                )}
              </button>
            </div>

            {datajudProcess && (
              <div className="mt-5 grid lg:grid-cols-4 gap-4">
                <MiniBox label="Processo" value={datajudProcess.number || "-"} />
                <MiniBox label="Tribunal" value={datajudProcess.court || "-"} />
                <MiniBox label="Classe" value={datajudProcess.className || "-"} />
                <MiniBox label="Andamentos" value={String(datajudProcess.movements?.length || 0)} color="text-primary" />
              </div>
            )}
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
          <Metric title="Minutas salvas" value={String(stats.draftsTotal)} color="text-primary" />
          <Metric title="Treinos Judge" value={String(stats.judgeTotal)} color="text-yellow-400" />
          <Metric title="Score médio Judge" value={`${stats.avgJudgeScore}/100`} color="text-green-400" />
        </section>

        <section className="grid md:grid-cols-4 gap-4">
          <Metric title="Chance média" value={`${stats.avgSuccess}%`} color="text-green-400" />
          <Metric title="Casos aceitos" value={String(stats.accepted)} color="text-primary" />
          <Metric title="Casos recusados" value={String(stats.rejected)} color="text-red-400" />
          <Metric
            title="Patrimônio NexJud"
            value={String(stats.total + stats.draftsTotal + stats.judgeTotal)}
            color="text-indigo-400"
          />
        </section>

        {/* O restante do seu dashboard permanece igual */}
      </div>
    </div>
  )
}

function Badge({ text }: { text: string }) {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-3">
      ✓ {text}
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

function MiniBox({ label, value, color = "" }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-black/20 rounded-xl p-4 border border-white/5">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  )
}
