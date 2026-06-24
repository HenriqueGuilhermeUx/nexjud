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
} from "lucide-react"

import { useAuth } from "@/context/AuthContext"
import { saveAnalysis } from "@/services/strategicAnalysisService"
import { getDashboardStats } from "@/services/dashboardService"
import { runStrategicAnalysis } from "@/services/strategicAiService"
import { generateStrategicPdf } from "@/services/pdfReport"

export default function HomeDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [caseText, setCaseText] = useState("")
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
                <Badge text="Jurisprudência Preditiva™" />
                <Badge text="Financial Exposure™" />
                <Badge text="AI Partner Council™" />
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

        <CardTitle icon={<Sparkles className="text-primary" />} title="Últimas Atividades NexJud™" highlight>
          {stats.latestActivities.length > 0 ? (
            <div className="space-y-3">
              {stats.latestActivities.map((item: any, index: number) => (
                <div key={index} className="rounded-xl bg-black/20 border border-white/5 p-4">
                  <p className="font-bold">{item.title}</p>
                  <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    {item.date ? new Date(item.date).toLocaleString("pt-BR") : "-"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">
              Suas análises, minutas e treinos aparecerão aqui.
            </p>
          )}
        </CardTitle>

        <CardTitle icon={<Brain className="text-primary" />} title="Executive Summary™" highlight>
          {analysisResult ? (
            <div className="space-y-4">
              <p className="text-gray-300 whitespace-pre-line">
                {analysisResult.executiveSummary || "Resumo executivo não informado."}
              </p>

              <div className="grid md:grid-cols-4 gap-4">
                <MiniBox label="Êxito" value={`${analysisResult.successProbability || 0}%`} color="text-green-400" />
                <MiniBox label="Risco" value={analysisResult.riskLevel || "-"} />
                <MiniBox label="Complexidade" value={analysisResult.complexity || "-"} />
                <MiniBox label="Decisão" value={analysisResult.partnerDecision || "-"} color="text-primary" />
              </div>
            </div>
          ) : (
            <p className="text-gray-500">O resumo executivo aparecerá aqui após a análise.</p>
          )}
        </CardTitle>

        {analysisResult && (
          <>
            <section className="grid lg:grid-cols-2 gap-6">
              <CardTitle icon={<Wand2 className="text-primary" />} title="One Click Actions™" highlight>
                <div className="grid gap-3">
                  {(analysisResult.oneClickActions || []).map((action: any, index: number) => (
                    <button
                      key={index}
                      onClick={() => {
                        if (action.action === "draft") {
                          localStorage.setItem(
                            "nexjud_draft_context",
                            JSON.stringify({
                              caseText,
                              focus: action.context || "",
                            })
                          )
                          navigate("/dashboard/draft-generator")
                        }

                        if (action.action === "judge") {
                          navigate("/dashboard/judge-simulator")
                        }

                        if (action.action === "settlement") {
                          alert(action.context || "Simulação de acordo será adicionada no próximo módulo.")
                        }
                      }}
                      className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-left hover:bg-primary/10 transition"
                    >
                      <div className="font-bold">{action.label}</div>
                      <div className="text-sm text-gray-400 mt-1">{action.context}</div>
                    </button>
                  ))}
                </div>
              </CardTitle>

              <CardTitle icon={<Scale className="text-green-400" />} title="Deal Economics™" success>
                <div className="grid md:grid-cols-2 gap-4">
                  <MiniBox label="Honorários" value={analysisResult.dealEconomics?.estimatedFees || "-"} />
                  <MiniBox label="Valor Esperado" value={analysisResult.dealEconomics?.expectedValue || "-"} />
                  <MiniBox label="Horas" value={analysisResult.dealEconomics?.estimatedHours || "-"} />
                  <MiniBox label="Retorno/Hora" value={analysisResult.dealEconomics?.hourlyReturn || "-"} />
                </div>

                <div className="mt-4 rounded-xl bg-black/20 border border-white/5 p-4">
                  <p className="text-sm text-gray-400">Recomendação econômica</p>
                  <p className="text-2xl font-bold text-green-400 mt-1">
                    {analysisResult.dealEconomics?.recommendation || "-"}
                  </p>
                  <p className="text-gray-300 mt-3">
                    {analysisResult.dealEconomics?.reason || "-"}
                  </p>
                </div>
              </CardTitle>
            </section>

            <section className="grid lg:grid-cols-3 gap-6">
              <CardTitle icon={<AlertTriangle className="text-yellow-400" />} title="Cliente Risk Score™" warning>
                <MiniBox
                  label="Score do cliente"
                  value={`${analysisResult.clientRisk?.score || 0}/100`}
                  color="text-yellow-400"
                />
                <MiniBox
                  label="Nível"
                  value={analysisResult.clientRisk?.level || "-"}
                  color="text-yellow-400"
                />
                <List title="Achados" items={analysisResult.clientRisk?.findings} prefix="⚠️" />
                <p className="text-gray-300 mt-4">
                  {analysisResult.clientRisk?.recommendation || "-"}
                </p>
              </CardTitle>

              <CardTitle icon={<ShieldAlert className="text-red-400" />} title="Opponent Intelligence™" danger>
                <p className="font-bold text-xl mb-2">
                  {analysisResult.opponentIntelligence?.profile || "-"}
                </p>
                <p className="text-gray-400 mb-4">
                  Chance de acordo: {analysisResult.opponentIntelligence?.settlementChance || "-"}
                </p>
                <List title="Táticas comuns" items={analysisResult.opponentIntelligence?.commonTactics} prefix="⚔️" />
                <List title="Defesa esperada" items={analysisResult.opponentIntelligence?.expectedDefense} prefix="🛡️" />
                <List title="Pontos de pressão" items={analysisResult.opponentIntelligence?.pressurePoints} prefix="🎯" />
              </CardTitle>

              <CardTitle icon={<FileText className="text-primary" />} title="Board Report™" highlight>
                <MiniBox
                  label="Decisão"
                  value={analysisResult.boardReport?.decision || "-"}
                  color="text-primary"
                />
                <MiniBox
                  label="Risco"
                  value={analysisResult.boardReport?.risk || "-"}
                  color="text-yellow-400"
                />
                <p className="text-gray-300 mt-4">
                  {analysisResult.boardReport?.executiveSummary || "-"}
                </p>
                <p className="text-gray-300 mt-4">
                  <strong>Impacto financeiro:</strong>{" "}
                  {analysisResult.boardReport?.financialImpact || "-"}
                </p>
                <p className="text-gray-300 mt-4">
                  <strong>Recomendação:</strong>{" "}
                  {analysisResult.boardReport?.recommendation || "-"}
                </p>
              </CardTitle>
            </section>

            <section className="grid lg:grid-cols-2 gap-6">
              <CardTitle icon={<TrendingUp className="text-primary" />} title="Jurisprudência Preditiva™" highlight>
                <div className="space-y-4">
                  <MiniBox
                    label="Tendência estimada"
                    value={`${analysisResult.jurisprudencePrediction?.favorableRate || 0}% favorável`}
                    color="text-green-400"
                  />
                  <p className="text-gray-300">
                    {analysisResult.jurisprudencePrediction?.thesisStrength || "-"}
                  </p>
                  <List title="Fatores favoráveis" items={analysisResult.jurisprudencePrediction?.favorableFactors} prefix="✓" />
                  <List title="Fatores desfavoráveis" items={analysisResult.jurisprudencePrediction?.unfavorableFactors} prefix="⚠️" />
                  <p className="text-xs text-gray-500">
                    {analysisResult.jurisprudencePrediction?.warning}
                  </p>
                </div>
              </CardTitle>

              <CardTitle icon={<Scale className="text-yellow-400" />} title="Financial Exposure™" warning>
                <div className="grid md:grid-cols-3 gap-3 mb-4">
                  <MiniBox label="Melhor cenário" value={analysisResult.financialExposure?.bestCase || "-"} color="text-green-400" />
                  <MiniBox label="Provável" value={analysisResult.financialExposure?.probableCase || "-"} color="text-yellow-400" />
                  <MiniBox label="Pior cenário" value={analysisResult.financialExposure?.worstCase || "-"} color="text-red-400" />
                </div>
                <p className="text-gray-300 mb-3">{analysisResult.financialExposure?.costRisk || "-"}</p>
                <p className="text-gray-300 mb-3">Faixa de acordo: {analysisResult.financialExposure?.settlementRange || "-"}</p>
                <p className="text-gray-300">{analysisResult.financialExposure?.financialRecommendation || "-"}</p>
              </CardTitle>
            </section>

            <CardTitle icon={<Target className="text-primary" />} title="AI Partner Council™" highlight>
              <div className="grid lg:grid-cols-4 gap-4">
                {(analysisResult.partnerCouncil || []).map((item: any, index: number) => (
                  <div key={index} className="rounded-xl bg-black/20 border border-white/5 p-4">
                    <p className="font-bold text-primary">{item.partner}</p>
                    <p className="text-xl font-bold mt-2">{item.decision}</p>
                    <p className="text-sm text-gray-400 mt-3">{item.reason}</p>
                  </div>
                ))}
              </div>
            </CardTitle>

            <CardTitle icon={<ShieldAlert className="text-red-400" />} title="Litigation War Room™" danger>
              <div className="grid lg:grid-cols-5 gap-4">
                <List title="Ataque" items={analysisResult.warRoom?.attackPlan} prefix="⚔️" />
                <List title="Defesa" items={analysisResult.warRoom?.defensePlan} prefix="🛡️" />
                <List title="Provas" items={analysisResult.warRoom?.evidencePlan} prefix="📎" />
                <List title="Negociação" items={analysisResult.warRoom?.negotiationPlan} prefix="🤝" />
                <List title="Urgente" items={analysisResult.warRoom?.emergencyActions} prefix="🚨" />
              </div>
            </CardTitle>

            <section className="grid lg:grid-cols-2 gap-6">
              <CardTitle icon={<Scale className="text-primary" />} title="Tribunal DNA™">
                <div className="space-y-4">
                  <MiniBox label="Perfil estimado" value={analysisResult.tribunalDna?.profile || "-"} color="text-primary" />
                  <List title="Valoriza" items={analysisResult.tribunalDna?.values} prefix="✓" />
                  <List title="Rejeita" items={analysisResult.tribunalDna?.rejects} prefix="✗" />
                  <p className="text-gray-300">{analysisResult.tribunalDna?.riskBehavior || "-"}</p>
                  <p className="text-gray-300">{analysisResult.tribunalDna?.strategicAdvice || "-"}</p>
                </div>
              </CardTitle>

              <CardTitle icon={<TrendingUp className="text-primary" />} title="Case Timeline™">
                <div className="space-y-3">
                  {(analysisResult.caseTimeline || []).map((item: any, index: number) => (
                    <div key={index} className="rounded-xl bg-black/20 border border-white/5 p-4">
                      <p className="text-sm text-primary font-bold">{item.date}</p>
                      <p className="font-semibold mt-1">{item.event}</p>
                      <p className="text-sm text-gray-400 mt-1">{item.impact}</p>
                    </div>
                  ))}
                </div>
              </CardTitle>
            </section>

            <section className="grid lg:grid-cols-2 gap-6">
              <CardTitle icon={<AlertTriangle className="text-red-400" />} title="Auditor Jurídico™" danger>
                <MiniBox label="Audit Score" value={`${analysisResult.auditorFindings?.auditScore || 0}/100`} color="text-yellow-400" />
                <div className="mt-4 grid md:grid-cols-2 gap-4">
                  <List title="Riscos críticos" items={analysisResult.auditorFindings?.criticalRisks} prefix="🚨" />
                  <List title="Inconsistências" items={analysisResult.auditorFindings?.inconsistencies} prefix="⚠️" />
                  <List title="Documentos ausentes" items={analysisResult.auditorFindings?.missingDocuments} prefix="📄" />
                  <List title="Passivos ocultos" items={analysisResult.auditorFindings?.hiddenLiabilities} prefix="💣" />
                </div>
              </CardTitle>

              <CardTitle icon={<FileText className="text-primary" />} title="Due Diligence IA™">
                <div className="grid md:grid-cols-2 gap-3 mb-4">
                  <MiniBox label="Score" value={`${analysisResult.dueDiligence?.score || 0}/100`} color="text-green-400" />
                  <MiniBox label="Risco" value={analysisResult.dueDiligence?.riskLevel || "-"} color="text-yellow-400" />
                </div>
                <List title="Achados relevantes" items={analysisResult.dueDiligence?.keyFindings} prefix="✓" />
                <List title="Bloqueadores" items={analysisResult.dueDiligence?.blockers} prefix="⛔" />
                <p className="text-gray-300 mt-4">{analysisResult.dueDiligence?.recommendation || "-"}</p>
              </CardTitle>
            </section>

            <CardTitle icon={<Sparkles className="text-primary" />} title="Legal Command Center™" highlight>
              <div className="grid md:grid-cols-4 gap-4 mb-4">
                <MiniBox label="Risco geral" value={analysisResult.legalCommandCenter?.overallRisk || "-"} />
                <MiniBox label="Prioridade" value={analysisResult.legalCommandCenter?.priority || "-"} color="text-yellow-400" />
                <MiniBox label="Ação agora" value={analysisResult.legalCommandCenter?.actionNow || "-"} />
                <MiniBox label="Decisão executiva" value={analysisResult.legalCommandCenter?.executiveDecision || "-"} color="text-primary" />
              </div>
              <p className="text-gray-300">{analysisResult.legalCommandCenter?.boardSummary || "-"}</p>
            </CardTitle>
          </>
        )}

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
          <CardTitle icon={<Target className="text-green-400" />} title="Winning Thesis™" success>
            <p className="text-gray-300">
              {analysisResult?.winningThesis || "A tese vencedora aparecerá aqui após a análise."}
            </p>
          </CardTitle>

          <CardTitle icon={<ShieldAlert className="text-red-400" />} title="Defense Thesis™" danger>
            <p className="text-gray-300">
              {analysisResult?.defenseThesis || "A tese defensiva aparecerá aqui após a análise."}
            </p>
          </CardTitle>
        </section>

        <CardTitle icon={<FileText className="text-primary" />} title="Evidence Checklist™">
          {analysisResult ? (
            <div className="grid md:grid-cols-2 gap-3">
              {(analysisResult.evidenceChecklist || []).map((item: string, index: number) => (
                <div key={index} className="bg-[#0f0f15] rounded-xl p-4 border border-white/5">
                  ✓ {item}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">O checklist probatório aparecerá aqui.</p>
          )}
        </CardTitle>

        <section className="grid lg:grid-cols-2 gap-6">
          <CardTitle icon={<Scale className="text-yellow-400" />} title="Settlement Intelligence™" warning>
            <p className="text-gray-300">
              {analysisResult?.settlementRecommendation || "A recomendação sobre acordo aparecerá aqui."}
            </p>
          </CardTitle>

          <CardTitle icon={<TrendingUp className="text-primary" />} title="Next Moves™">
            {analysisResult ? (
              <ul className="space-y-3 text-gray-300">
                {(analysisResult.nextMoves || []).map((item: string, index: number) => (
                  <li key={index}>➜ {item}</li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">Os próximos movimentos aparecerão aqui.</p>
            )}
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
          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={handleGeneratePdf}
              className="w-full py-5 rounded-2xl bg-primary font-bold text-lg hover:opacity-90"
            >
              <FileText className="inline mr-2" />
              GERAR RELATÓRIO EXECUTIVO
            </button>

            <button
              onClick={handleGenerateDraftFromAnalysis}
              className="w-full py-5 rounded-2xl bg-[#171721] border border-[#2a2a35] font-bold text-lg hover:bg-[#20202b]"
            >
              <Wand2 className="inline mr-2" />
              GERAR MINUTA COM ESTA ANÁLISE
            </button>
          </div>
        )}
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

function List({ title, items, prefix }: { title: string; items?: any[]; prefix: string }) {
  const list = Array.isArray(items) ? items : []

  return (
    <div className="rounded-xl bg-black/20 border border-white/5 p-4">
      <p className="font-bold mb-3">{title}</p>
      {list.length ? (
        <ul className="space-y-2 text-gray-300">
          {list.map((item: any, index: number) => (
            <li key={index}>
              {prefix} {String(item)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500">Sem itens.</p>
      )}
    </div>
  )
}

function CardTitle({ icon, title, children, danger, highlight, success, warning }: any) {
  return (
    <div
      className={`rounded-2xl border p-6 ${
        highlight
          ? "bg-gradient-to-r from-primary/10 to-indigo-500/10 border-primary/30"
          : danger
          ? "bg-[#111118] border-red-900/70"
          : success
          ? "bg-[#111118] border-green-900/70"
          : warning
          ? "bg-[#111118] border-yellow-900/70"
          : "bg-[#111118] border-[#2a2a35]"
      }`}
    >
      <div className={`flex items-center gap-2 mb-4 ${danger ? "text-red-400" : success ? "text-green-400" : warning ? "text-yellow-400" : ""}`}>
        {icon}
        <h2 className="font-bold text-xl">{title}</h2>
      </div>
      {children}
    </div>
  )
}
