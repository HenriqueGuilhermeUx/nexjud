import { useState } from "react"
import {
  Brain,
  Loader2,
  ShieldAlert,
  Users,
  FileText,
  Target,
  Building2,
  TrendingUp,
  Copy,
} from "lucide-react"
import { runLegalIntelligenceEngine } from "@/services/legalIntelligenceEngine"

export default function LegalIntelligenceEngine() {
  const [caseText, setCaseText] = useState("")
  const [opponentName, setOpponentName] = useState("")
  const [clientName, setClientName] = useState("")
  const [tribunal, setTribunal] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  async function analyze() {
    if (!caseText.trim()) {
      alert("Cole o caso primeiro.")
      return
    }

    setLoading(true)

    try {
      const data = await runLegalIntelligenceEngine({
        caseText,
        opponentName,
        clientName,
        tribunal,
      })

      setResult(data)
      alert("Legal Intelligence Engine concluído.")
    } catch (error) {
      console.error(error)
      alert("Erro ao rodar Legal Intelligence Engine.")
    } finally {
      setLoading(false)
    }
  }

  function copyExecutiveReport() {
    if (!result) return

    navigator.clipboard.writeText(buildExecutiveReport(result))
    alert("Relatório executivo copiado.")
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
        <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-indigo-500/10 to-[#05050a] p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="text-primary" size={44} />
            <div>
              <h1 className="text-4xl font-bold">Legal Intelligence Engine™</h1>
              <p className="text-muted-foreground mt-1">
                Cole o caso uma vez. O NexJud executa Strategic Analysis, War Room,
                Partner Council, Opponent Intelligence e Board Report em uma análise única.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <textarea
            value={caseText}
            onChange={(e) => setCaseText(e.target.value)}
            placeholder="Cole aqui o caso, resumo dos fatos, tese ou petição..."
            className="w-full h-72 rounded-2xl bg-[#0f0f15] border border-[#2a2a35] p-5 outline-none focus:border-primary"
          />

          <div className="grid md:grid-cols-3 gap-4">
            <input
              value={opponentName}
              onChange={(e) => setOpponentName(e.target.value)}
              placeholder="Adversário opcional"
              className="rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4 outline-none focus:border-primary"
            />

            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Cliente opcional"
              className="rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4 outline-none focus:border-primary"
            />

            <input
              value={tribunal}
              onChange={(e) => setTribunal(e.target.value)}
              placeholder="Tribunal opcional"
              className="rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4 outline-none focus:border-primary"
            />
          </div>

          <button
            onClick={analyze}
            disabled={loading}
            className="w-full py-4 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" />
                Executando motor completo...
              </>
            ) : (
              <>
                <Brain />
                Analisar Caso com Legal Intelligence Engine
              </>
            )}
          </button>
        </section>

        {result && (
          <>
            <section className="grid md:grid-cols-4 gap-4">
              <Metric
                title="Chance"
                value={`${result.strategic?.successProbability || 0}%`}
                color="text-primary"
              />
              <Metric
                title="Risco"
                value={result.strategic?.riskLevel || result.boardReport?.riskLevel || "-"}
                color="text-yellow-400"
              />
              <Metric
                title="Decisão"
                value={result.strategic?.partnerDecision || result.boardReport?.decision || "-"}
                color="text-green-400"
              />
              <Metric
                title="Board"
                value={result.boardReport?.confidenceLevel || "-"}
              />
            </section>

            <section className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 to-indigo-500/10 p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-2xl font-bold">Executive Report</h2>
                  <p className="text-muted-foreground">
                    Relatório consolidado gerado pelo cérebro do NexJud.
                  </p>
                </div>

                <button
                  onClick={copyExecutiveReport}
                  className="px-5 py-3 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2"
                >
                  <Copy size={18} />
                  Copiar Relatório
                </button>
              </div>

              <div className="grid lg:grid-cols-2 gap-5">
                <Card title="Resumo Estratégico" icon={<FileText className="text-primary" />}>
                  <p className="text-gray-300 whitespace-pre-line">
                    {result.strategic?.executiveSummary ||
                      result.boardReport?.executiveSummary ||
                      "-"}
                  </p>
                </Card>

                <Card title="Board Report" icon={<TrendingUp className="text-green-400" />}>
                  <MiniBox label="Decisão" value={result.boardReport?.decision || "-"} />
                  <MiniBox label="Impacto Financeiro" value={result.boardReport?.financialImpact || "-"} />
                  <List title="Ações recomendadas" items={result.boardReport?.recommendedActions} prefix="➜" />
                </Card>
              </div>
            </section>

            <section className="grid lg:grid-cols-3 gap-6">
              <Card title="Strategic Analysis" icon={<Target className="text-primary" />}>
                <MiniBox label="Título" value={result.strategic?.title || "-"} />
                <MiniBox label="Probabilidade" value={`${result.strategic?.successProbability || 0}%`} />
                <MiniBox label="Potencial" value={result.strategic?.financialPotential || "-"} />
                <List title="Next Moves" items={result.strategic?.nextMoves} prefix="➜" />
              </Card>

              <Card title="War Room" icon={<ShieldAlert className="text-red-400" />}>
                <MiniBox label="Prioridade" value={result.warRoom?.priority || "-"} />
                <List title="Riscos" items={result.warRoom?.risks} prefix="🚨" />
                <List title="Próximos movimentos" items={result.warRoom?.nextMoves} prefix="➜" />
              </Card>

              <Card title="Partner Council" icon={<Users className="text-primary" />}>
                <MiniBox label="Voto final" value={result.partnerCouncil?.finalVote || "-"} />
                <MiniBox label="Risco" value={result.partnerCouncil?.riskLevel || "-"} />
                <p className="text-gray-300 mt-4">
                  {result.partnerCouncil?.recommendedPosition || "-"}
                </p>
              </Card>

              <Card title="Opponent Intelligence" icon={<Building2 className="text-red-400" />}>
                {result.opponent ? (
                  <>
                    <MiniBox label="Perfil" value={result.opponent?.profile || "-"} />
                    <MiniBox label="Agressividade" value={result.opponent?.aggressivenessLevel || "-"} />
                    <List title="Pontos de pressão" items={result.opponent?.pressurePoints} prefix="🎯" />
                  </>
                ) : (
                  <p className="text-gray-500">
                    Informe um adversário para incluir esta análise.
                  </p>
                )}
              </Card>

              <Card title="Plano Executivo" icon={<Brain className="text-primary" />} highlight>
                <List title="Alertas" items={result.boardReport?.criticalAlerts} prefix="⚠️" />
                <List title="Pauta próxima reunião" items={result.boardReport?.nextBoardAgenda} prefix="•" />
              </Card>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function buildExecutiveReport(result: any) {
  return `
LEGAL INTELLIGENCE ENGINE — NEXJUD

Data:
${new Date(result.generatedAt).toLocaleString("pt-BR")}

Resumo:
${result.strategic?.executiveSummary || result.boardReport?.executiveSummary || "-"}

Chance:
${result.strategic?.successProbability || 0}%

Risco:
${result.strategic?.riskLevel || result.boardReport?.riskLevel || "-"}

Decisão:
${result.strategic?.partnerDecision || result.boardReport?.decision || "-"}

War Room:
${(result.warRoom?.risks || []).map((x: string) => `- ${x}`).join("\n")}

Partner Council:
${result.partnerCouncil?.finalVote || "-"}

Board Report:
${result.boardReport?.partnerBriefing || "-"}

Ações recomendadas:
${(result.boardReport?.recommendedActions || []).map((x: string) => `- ${x}`).join("\n")}
`.trim()
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

function Card({ title, icon, children, highlight }: any) {
  return (
    <div
      className={`rounded-2xl border p-6 ${
        highlight
          ? "bg-gradient-to-r from-primary/10 to-indigo-500/10 border-primary/30"
          : "bg-[#111118] border-[#2a2a35]"
      }`}
    >
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h2 className="font-bold text-xl">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function MiniBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/20 border border-white/5 p-4 mt-3 first:mt-0">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-lg font-bold text-gray-200 whitespace-pre-line">{value}</p>
    </div>
  )
}

function List({
  title,
  items,
  prefix,
}: {
  title: string
  items?: any[]
  prefix: string
}) {
  const list = Array.isArray(items) ? items : []

  return (
    <div className="mt-4">
      <p className="font-bold mb-2">{title}</p>
      {list.length === 0 ? (
        <p className="text-gray-500">Sem itens.</p>
      ) : (
        <ul className="space-y-2 text-gray-300">
          {list.map((item, index) => (
            <li key={index}>
              {prefix} {String(item)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
