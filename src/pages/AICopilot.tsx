import { useState } from "react"
import {
  Brain,
  Loader2,
  Sparkles,
  ShieldAlert,
  Scale,
  Users,
  FileText,
  ClipboardList,
  Target,
  Copy,
  Wand2,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { runAICopilot } from "@/services/copilotService"

export default function AICopilot() {
  const navigate = useNavigate()

  const [prompt, setPrompt] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  async function execute() {
    if (!prompt.trim()) {
      alert("Descreva o caso.")
      return
    }

    setLoading(true)

    try {
      const response = await runAICopilot(prompt)
      setResult(response)
      alert("AI Copilot concluiu a análise completa.")
    } catch (e: any) {
      console.error(e)
      alert(e.message || "Erro ao executar AI Copilot.")
    } finally {
      setLoading(false)
    }
  }

  function loadExample() {
    setPrompt(
      "Cliente quer ajuizar ação contra banco por descontos indevidos em conta corrente, com extratos, protocolos de atendimento e reclamação no consumidor.gov. Banco alega contratação regular. Avalie se vale entrar, estratégia, riscos, provas, acordo e minuta recomendada."
    )
  }

  function copyReport() {
    if (!result) return

    const text = buildCopilotReport(result)
    navigator.clipboard.writeText(text)
    alert("Relatório copiado.")
  }

  function generateDraft() {
    if (!result) return

    localStorage.setItem(
      "nexjud_draft_context",
      JSON.stringify({
        caseText: result.prompt,
        focus: buildCopilotReport(result),
      })
    )

    navigate("/dashboard/draft-generator")
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
        <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-indigo-500/10 to-[#05050a] p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="text-primary" size={44} />
            <div>
              <h1 className="text-4xl font-bold">AI Legal Copilot™</h1>
              <p className="text-muted-foreground mt-1">
                Um único comando executa Strategic Analysis, Litigation Strategy, War Room, Partner Council e Board Report.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Cole o caso ou faça uma pergunta. Ex: vale entrar com essa ação? Monte estratégia completa e próximos passos..."
            className="w-full h-64 rounded-2xl bg-[#0f0f15] border border-[#2a2a35] p-5 outline-none focus:border-primary"
          />

          <div className="flex flex-col sm:flex-row gap-3 mt-5">
            <button
              onClick={execute}
              disabled={loading}
              className="flex-1 px-8 py-4 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {loading ? "Executando inteligência completa..." : "Executar AI Copilot"}
            </button>

            <button
              onClick={loadExample}
              className="px-6 py-4 rounded-xl bg-[#171721] border border-border font-bold"
            >
              Exemplo
            </button>
          </div>
        </section>

        {result && (
          <>
            <section className="grid md:grid-cols-4 gap-4">
              <Metric
                title="Chance"
                value={`${result.executive?.successProbability || 0}%`}
                color="text-primary"
              />
              <Metric
                title="Risco"
                value={result.executive?.riskLevel || "-"}
                color="text-yellow-400"
              />
              <Metric
                title="Decisão"
                value={result.executive?.decision || "-"}
                color="text-green-400"
              />
              <Metric
                title="Próximo passo"
                value={result.executive?.nextMove ? "Definido" : "-"}
                color="text-indigo-400"
              />
            </section>

            <section className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 to-indigo-500/10 p-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">
                    {result.executive?.title || "Relatório Executivo Copilot"}
                  </h2>

                  <p className="text-gray-300 mt-4 whitespace-pre-line">
                    {result.executive?.summary || "-"}
                  </p>

                  <div className="rounded-xl bg-black/20 border border-white/5 p-4 mt-5">
                    <p className="text-xs text-gray-400 mb-2">Próximo movimento recomendado</p>
                    <p className="text-gray-300">{result.executive?.nextMove || "-"}</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row lg:flex-col gap-3">
                  <button
                    onClick={copyReport}
                    className="px-5 py-3 rounded-xl bg-[#171721] border border-border font-bold flex items-center justify-center gap-2"
                  >
                    <Copy size={18} />
                    Copiar
                  </button>

                  <button
                    onClick={generateDraft}
                    className="px-5 py-3 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2"
                  >
                    <Wand2 size={18} />
                    Gerar minuta
                  </button>
                </div>
              </div>
            </section>

            <section className="grid lg:grid-cols-2 gap-5">
              <Card title="Strategic Analysis" icon={<Scale className="text-primary" />}>
                <MiniBox label="Probabilidade" value={`${result.strategic?.successProbability || 0}%`} />
                <MiniBox label="Risco" value={result.strategic?.riskLevel || "-"} />
                <MiniBox label="Decisão do sócio" value={result.strategic?.partnerDecision || "-"} />
                <List title="Próximos movimentos" items={result.strategic?.nextMoves} prefix="➜" />
              </Card>

              <Card title="Litigation Strategy" icon={<Target className="text-green-400" />}>
                <MiniBox label="Diagnóstico" value={result.litigation?.diagnosis || "-"} />
                <MiniBox label="Plano A" value={result.litigation?.planA?.objective || "-"} />
                <MiniBox label="Próximo movimento" value={result.litigation?.nextMove || "-"} />
                <List title="Checklist" items={result.litigation?.checklist} prefix="☑" />
              </Card>

              <Card title="War Room" icon={<ShieldAlert className="text-red-400" />}>
                <List title="Ataque" items={result.warRoom?.attackPlan || result.warRoom?.risks} prefix="⚔️" />
                <List title="Defesa" items={result.warRoom?.defensePlan} prefix="🛡️" />
                <List title="Ações urgentes" items={result.warRoom?.emergencyActions || result.warRoom?.nextMoves} prefix="🚨" />
              </Card>

              <Card title="Partner Council" icon={<Users className="text-green-400" />}>
                <MiniBox label="Voto final" value={result.partnerCouncil?.finalVote || result.partnerCouncil?.final_vote || "-"} />
                <MiniBox label="Risco" value={result.partnerCouncil?.riskLevel || "-"} />
                <p className="text-gray-300 mt-4">
                  {result.partnerCouncil?.recommendedPosition || result.partnerCouncil?.summary || "-"}
                </p>
              </Card>

              <div className="lg:col-span-2">
                <Card title="Board Report" icon={<FileText className="text-primary" />}>
                  <MiniBox label="Decisão" value={result.boardReport?.decision || "-"} />
                  <MiniBox label="Impacto financeiro" value={result.boardReport?.financialImpact || "-"} />
                  <List title="Ações recomendadas" items={result.boardReport?.recommendedActions} prefix="➜" />
                  <List title="Alertas críticos" items={result.boardReport?.criticalAlerts} prefix="⚠️" />
                </Card>
              </div>

              <div className="lg:col-span-2">
                <Card title="Relatório Técnico Consolidado" icon={<ClipboardList className="text-primary" />}>
                  <pre className="whitespace-pre-wrap text-sm text-gray-300 overflow-auto">
                    {buildCopilotReport(result)}
                  </pre>
                </Card>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function buildCopilotReport(result: any) {
  return `
AI LEGAL COPILOT — NEXJUD

Data:
${new Date(result.generatedAt).toLocaleString("pt-BR")}

CASO:
${result.prompt || "-"}

RESUMO EXECUTIVO:
${result.executive?.summary || "-"}

CHANCE:
${result.executive?.successProbability || 0}%

RISCO:
${result.executive?.riskLevel || "-"}

DECISÃO:
${result.executive?.decision || "-"}

PRÓXIMO MOVIMENTO:
${result.executive?.nextMove || "-"}

LITIGATION STRATEGY:
${result.litigation?.diagnosis || "-"}

PLANO A:
${result.litigation?.planA?.objective || "-"}

PROVAS PRIORITÁRIAS:
${(result.litigation?.evidence || []).map((x: string) => `- ${x}`).join("\n")}

WAR ROOM:
${[
  ...(result.warRoom?.attackPlan || []),
  ...(result.warRoom?.defensePlan || []),
  ...(result.warRoom?.emergencyActions || []),
]
  .map((x: string) => `- ${x}`)
  .join("\n")}

BOARD REPORT:
${result.boardReport?.executiveSummary || result.boardReport?.partnerBriefing || "-"}
`.trim()
}

function Metric({ title, value, color = "" }: { title: string; value: string; color?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">{title}</p>
      <h2 className={`text-2xl font-bold mt-1 ${color}`}>{value}</h2>
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

function MiniBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/20 border border-white/5 p-4 mt-3 first:mt-0">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-gray-200 font-semibold whitespace-pre-line">{value}</p>
    </div>
  )
}

function List({ title, items, prefix }: { title: string; items?: any[]; prefix: string }) {
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
