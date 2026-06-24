import { useEffect, useState } from "react"
import {
  Building2,
  Scale,
  ShieldAlert,
  AlertTriangle,
  FileText,
  Brain,
  Loader2,
  Target,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import {
  getUserProcesses,
  calculateTribunalDna,
  calculateOpponentIntelligence,
  calculateClientRisk,
  saveBoardReport,
  getBoardReports,
} from "@/services/enterpriseIntelligenceService"
import { generateBoardReportPdf } from "@/services/boardReportPdf"

export default function EnterpriseCommandCenter() {
  const { user } = useAuth()

  const [processes, setProcesses] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [calculating, setCalculating] = useState(false)

  const [tribunal, setTribunal] = useState("")
  const [opponentName, setOpponentName] = useState("")
  const [clientName, setClientName] = useState("")

  const [tribunalResult, setTribunalResult] = useState<any>(null)
  const [opponentResult, setOpponentResult] = useState<any>(null)
  const [clientRiskResult, setClientRiskResult] = useState<any>(null)

  useEffect(() => {
    load()
  }, [user])

  async function load() {
    if (!user?.id) return

    setLoading(true)

    try {
      const [processData, reportData] = await Promise.all([
        getUserProcesses(user.id),
        getBoardReports(user.id),
      ])

      setProcesses(processData)
      setReports(reportData)

      if (processData?.[0]?.tribunal) {
        setTribunal(processData[0].tribunal)
      }
    } catch (error) {
      console.error(error)
      alert("Erro ao carregar Command Center.")
    } finally {
      setLoading(false)
    }
  }

  async function runTribunalDna() {
    if (!user?.id) return
    if (!tribunal.trim()) {
      alert("Informe um tribunal.")
      return
    }

    setCalculating(true)

    try {
      const result = await calculateTribunalDna(user.id, tribunal)
      setTribunalResult(result)
      alert("Tribunal DNA calculado.")
    } catch (error) {
      console.error(error)
      alert("Erro ao calcular Tribunal DNA.")
    } finally {
      setCalculating(false)
    }
  }

  async function runOpponent() {
    if (!user?.id) return
    if (!opponentName.trim()) {
      alert("Informe o nome do adversário.")
      return
    }

    setCalculating(true)

    try {
      const result = await calculateOpponentIntelligence(user.id, opponentName)
      setOpponentResult(result)
      alert("Opponent Intelligence calculado.")
    } catch (error) {
      console.error(error)
      alert("Erro ao calcular Opponent Intelligence.")
    } finally {
      setCalculating(false)
    }
  }

  async function runClientRisk() {
    if (!user?.id) return
    if (!clientName.trim()) {
      alert("Informe o nome do cliente.")
      return
    }

    setCalculating(true)

    try {
      const result = await calculateClientRisk(user.id, clientName)
      setClientRiskResult(result)
      alert("Client Risk calculado.")
    } catch (error) {
      console.error(error)
      alert("Erro ao calcular Client Risk.")
    } finally {
      setCalculating(false)
    }
  }

  async function createBoardReport() {
    if (!user?.id) return

    setCalculating(true)

    try {
      const criticalProcesses = processes.filter((p) =>
        JSON.stringify(p.dados || {}).toLowerCase().includes("execução")
      ).length

      const report = await saveBoardReport({
        user_id: user.id,
        title: `Board Report NexJud - ${new Date().toLocaleDateString("pt-BR")}`,
        report_type: "executive",
        summary: `Carteira com ${processes.length} processos monitorados, ${criticalProcesses} com sinais críticos e ${new Set(
          processes.map((p) => p.tribunal).filter(Boolean)
        ).size} tribunais distintos.`,
        decision:
          criticalProcesses > 5
            ? "AÇÃO IMEDIATA"
            : processes.length > 0
            ? "MONITORAR"
            : "SEM DADOS",
        risk_level:
          criticalProcesses > 5 ? "Alto" : criticalProcesses > 0 ? "Médio" : "Baixo",
        financial_impact:
          "Impacto financeiro depende das análises individuais e deve ser consolidado por caso.",
        data: {
          totalProcesses: processes.length,
          criticalProcesses,
          tribunalResult,
          opponentResult,
          clientRiskResult,
          generatedAt: new Date().toISOString(),
        },
      })

      setReports((prev) => [report, ...prev])
      alert("Board Report salvo.")
    } catch (error) {
      console.error(error)
      alert("Erro ao salvar Board Report.")
    } finally {
      setCalculating(false)
    }
  }

  const total = processes.length
  const tribunais = new Set(processes.map((p) => p.tribunal).filter(Boolean)).size
  const classes = new Set(processes.map((p) => p.classe).filter(Boolean)).size
  const orgaos = new Set(processes.map((p) => p.orgao_julgador).filter(Boolean)).size

  if (loading) {
    return <div className="p-6">Carregando Enterprise Command Center...</div>
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
        <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-indigo-500/10 to-[#05050a] p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="text-primary" size={40} />
            <div>
              <h1 className="text-4xl font-bold">NexJud Enterprise Command Center™</h1>
              <p className="text-muted-foreground mt-1">
                Tribunal DNA, Opponent Intelligence, Client Risk, Board Report e visão executiva da carteira.
              </p>
            </div>
          </div>
        </section>

        <section className="grid md:grid-cols-4 gap-4">
          <Metric title="Processos monitorados" value={String(total)} color="text-primary" />
          <Metric title="Tribunais" value={String(tribunais)} />
          <Metric title="Classes" value={String(classes)} />
          <Metric title="Órgãos julgadores" value={String(orgaos)} color="text-green-400" />
        </section>

        <section className="grid lg:grid-cols-3 gap-6">
          <Card title="Tribunal DNA™ Real" icon={<Scale className="text-primary" />} highlight>
            <input
              value={tribunal}
              onChange={(e) => setTribunal(e.target.value)}
              placeholder="Ex: TJSP, TRF3, TRT2..."
              className="w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4 outline-none focus:border-primary mb-3"
            />

            <button
              onClick={runTribunalDna}
              disabled={calculating}
              className="w-full py-3 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {calculating ? <Loader2 className="animate-spin" /> : <Scale size={18} />}
              Calcular Tribunal DNA
            </button>

            {tribunalResult && (
              <div className="mt-5 space-y-3">
                <MiniBox label="Processos" value={String(tribunalResult.total_processes || 0)} />
                <MiniBox label="Média de andamentos" value={String(tribunalResult.avg_movements || 0)} />
                <p className="text-gray-300">{tribunalResult.profile}</p>
              </div>
            )}
          </Card>

          <Card title="Opponent Intelligence™ Real" icon={<ShieldAlert className="text-red-400" />} danger>
            <input
              value={opponentName}
              onChange={(e) => setOpponentName(e.target.value)}
              placeholder="Ex: Banco X, INSS, Município..."
              className="w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4 outline-none focus:border-primary mb-3"
            />

            <button
              onClick={runOpponent}
              disabled={calculating}
              className="w-full py-3 rounded-xl bg-red-600 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {calculating ? <Loader2 className="animate-spin" /> : <ShieldAlert size={18} />}
              Calcular Adversário
            </button>

            {opponentResult && (
              <div className="mt-5 space-y-3">
                <MiniBox label="Processos encontrados" value={String(opponentResult.total_processes || 0)} />
                <MiniBox label="Sinal de recurso" value={`${opponentResult.appeal_signal || 0}%`} />
                <MiniBox label="Sinal de acordo" value={`${opponentResult.settlement_signal || 0}%`} />
                <p className="text-gray-300">{opponentResult.profile}</p>
              </div>
            )}
          </Card>

          <Card title="Client Risk Score™" icon={<AlertTriangle className="text-yellow-400" />} warning>
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Nome do cliente/empresa"
              className="w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4 outline-none focus:border-primary mb-3"
            />

            <button
              onClick={runClientRisk}
              disabled={calculating}
              className="w-full py-3 rounded-xl bg-yellow-600 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {calculating ? <Loader2 className="animate-spin" /> : <AlertTriangle size={18} />}
              Calcular Client Risk
            </button>

            {clientRiskResult && (
              <div className="mt-5 space-y-3">
                <MiniBox label="Score" value={`${clientRiskResult.risk_score || 0}/100`} />
                <MiniBox label="Nível" value={clientRiskResult.risk_level || "-"} />
                <List items={clientRiskResult.findings} prefix="⚠️" />
              </div>
            )}
          </Card>
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          <Card title="Board Report Executivo™" icon={<FileText className="text-primary" />} highlight>
            <p className="text-gray-300 mb-4">
              Gere um resumo executivo da carteira para sócios, diretoria ou cliente corporativo.
            </p>

            <button
              onClick={createBoardReport}
              disabled={calculating}
              className="w-full py-4 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {calculating ? <Loader2 className="animate-spin" /> : <FileText size={18} />}
              Gerar Board Report
            </button>

            <div className="mt-5 space-y-3">
              {reports.slice(0, 3).map((item) => (
                <div key={item.id} className="rounded-xl bg-black/20 border border-white/5 p-4">
                  <p className="font-bold">{item.title}</p>
                  <p className="text-sm text-gray-400 mt-1">{item.summary}</p>
                  <div className="grid md:grid-cols-3 gap-3 mt-3">
                    <MiniBox label="Decisão" value={item.decision || "-"} />
                    <MiniBox label="Risco" value={item.risk_level || "-"} />
                    <MiniBox label="Criado em" value={item.created_at ? new Date(item.created_at).toLocaleDateString("pt-BR") : "-"} />
                  </div>
                  <div className="mt-4">
  <button
    onClick={() => generateBoardReportPdf(item)}
    className="px-4 py-2 rounded-xl bg-primary text-white font-semibold"
  >
    Exportar PDF Executivo
  </button>
</div>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Executive Command Summary™" icon={<Target className="text-green-400" />} success>
            <div className="space-y-4">
              <MiniBox
                label="Estado da carteira"
                value={total > 0 ? "Ativa" : "Sem processos"}
                color={total > 0 ? "text-green-400" : "text-yellow-400"}
              />

              <MiniBox
                label="Maturidade de dados"
                value={total >= 20 ? "Alta" : total >= 5 ? "Média" : "Inicial"}
              />

              <p className="text-gray-300">
                {total >= 20
                  ? "A carteira já tem volume suficiente para gerar padrões iniciais de Tribunal DNA e Opponent Intelligence."
                  : total >= 5
                  ? "A carteira já permite leituras preliminares, mas deve ser ampliada com mais consultas CNJ."
                  : "Consulte mais processos via CNJ/DataJud para alimentar a inteligência corporativa."}
              </p>
            </div>
          </Card>
        </section>
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

function MiniBox({
  label,
  value,
  color = "",
}: {
  label: string
  value: string
  color?: string
}) {
  return (
    <div className="rounded-xl bg-black/20 border border-white/5 p-4">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  )
}

function Card({ title, icon, children, danger, highlight, warning, success }: any) {
  return (
    <div
      className={`rounded-2xl border p-6 ${
        highlight
          ? "bg-gradient-to-r from-primary/10 to-indigo-500/10 border-primary/30"
          : danger
          ? "bg-[#111118] border-red-900/70"
          : warning
          ? "bg-[#111118] border-yellow-900/70"
          : success
          ? "bg-[#111118] border-green-900/70"
          : "bg-[#111118] border-border"
      }`}
    >
      <div
        className={`flex items-center gap-2 mb-4 ${
          danger
            ? "text-red-400"
            : warning
            ? "text-yellow-400"
            : success
            ? "text-green-400"
            : ""
        }`}
      >
        {icon}
        <h2 className="font-bold text-xl">{title}</h2>
      </div>

      {children}
    </div>
  )
}

function List({ items, prefix }: { items?: any[]; prefix: string }) {
  const list = Array.isArray(items) ? items : []

  if (!list.length) {
    return <p className="text-gray-500">Sem achados.</p>
  }

  return (
    <ul className="space-y-2 text-gray-300">
      {list.map((item, index) => (
        <li key={index}>
          {prefix} {String(item)}
        </li>
      ))}
    </ul>
  )
}
