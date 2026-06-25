import { useState } from "react"
import {
  Brain,
  Loader2,
  FileText,
  Target,
  ShieldAlert,
  CheckCircle,
  Clock,
  Scale,
  Save,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { runLitigationStrategyAi } from "@/services/litigationStrategyAiService"
import { saveLitigationStrategy } from "@/services/litigationStrategyService"

export default function LitigationStrategyCenter() {
  const { user } = useAuth()

  const [caseText, setCaseText] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<any>(null)

  async function generate() {
    if (!caseText.trim()) return alert("Cole o caso primeiro.")

    setLoading(true)

    try {
      const data = await runLitigationStrategyAi(caseText)
      setResult(data)
      alert("Estratégia gerada.")
    } catch (error) {
      console.error(error)
      alert("Erro ao gerar estratégia.")
    } finally {
      setLoading(false)
    }
  }

  async function save() {
    if (!user?.id) return alert("Faça login novamente.")
    if (!result) return alert("Gere a estratégia primeiro.")

    setSaving(true)

    try {
      await saveLitigationStrategy({
        user_id: user.id,
        title: result.title || "Litigation Strategy NexJud",
        case_text: caseText,
        strategy: result,
      })

      alert("Estratégia salva.")
    } catch (error) {
      console.error(error)
      alert("Erro ao salvar estratégia.")
    } finally {
      setSaving(false)
    }
  }

  function loadExample() {
    setCaseText(
      "Ação trabalhista com pedido de reconhecimento de vínculo empregatício, horas extras e danos morais. O reclamante possui mensagens de WhatsApp com ordens diárias, comprovantes de pagamento recorrente e testemunhas. A empresa sustenta autonomia, ausência de exclusividade e prestação eventual."
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
        <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-indigo-500/10 to-[#05050a] p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="text-primary" size={42} />
            <div>
              <h1 className="text-4xl font-bold">Litigation Strategy AI™</h1>
              <p className="text-muted-foreground mt-1">
                Plano jurídico executável: Plano A, Plano B, Plano C, provas, pedidos, cronograma e próximo movimento.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <textarea
            value={caseText}
            onChange={(e) => setCaseText(e.target.value)}
            placeholder="Cole aqui o caso, resumo dos fatos ou tese..."
            className="w-full h-72 rounded-2xl bg-[#0f0f15] border border-[#2a2a35] p-5 outline-none focus:border-primary"
          />

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={generate}
              disabled={loading}
              className="flex-1 py-4 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Brain />}
              {loading ? "Gerando estratégia..." : "Gerar Estratégia"}
            </button>

            <button
              onClick={loadExample}
              className="px-6 py-4 rounded-xl bg-[#171721] border border-[#2a2a35] font-bold"
            >
              Exemplo
            </button>
          </div>
        </section>

        {result && (
          <>
            <section className="grid md:grid-cols-4 gap-4">
              <Metric title="Chance" value={`${result.successProbability || 0}%`} color="text-primary" />
              <Metric title="Risco" value={result.riskLevel || "-"} color="text-yellow-400" />
              <Metric title="Planos" value="A / B / C" color="text-green-400" />
              <Metric title="Próximo movimento" value={result.nextMove ? "Definido" : "-"} />
            </section>

            <section className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 to-indigo-500/10 p-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">{result.title || "Estratégia"}</h2>
                  <p className="text-gray-300 mt-3 whitespace-pre-line">
                    {result.executiveSummary || result.diagnosis || "-"}
                  </p>
                </div>

                <button
                  onClick={save}
                  disabled={saving}
                  className="px-5 py-3 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                  Salvar
                </button>
              </div>
            </section>

            <section className="grid lg:grid-cols-3 gap-6">
              <PlanCard title="Plano A" plan={result.planA} icon={<Target className="text-green-400" />} />
              <PlanCard title="Plano B" plan={result.planB} icon={<Scale className="text-yellow-400" />} />
              <PlanCard title="Plano C" plan={result.planC} icon={<ShieldAlert className="text-red-400" />} />
            </section>

            <section className="grid lg:grid-cols-2 gap-6">
              <Card title="Provas Prioritárias" icon={<FileText className="text-primary" />}>
                <List items={result.evidence} prefix="📎" />
              </Card>

              <Card title="Pedidos Recomendados" icon={<CheckCircle className="text-green-400" />}>
                <List items={result.claims} prefix="✓" />
              </Card>

              <Card title="Testemunhas / Perfis" icon={<Brain className="text-primary" />}>
                <List items={result.witnesses} prefix="👤" />
              </Card>

              <Card title="Fragilidades e Forças" icon={<ShieldAlert className="text-red-400" />}>
                <p className="font-bold mb-2">Pontos fortes</p>
                <List items={result.strongPoints} prefix="+" />
                <p className="font-bold mt-5 mb-2">Pontos fracos</p>
                <List items={result.weakPoints} prefix="⚠️" />
              </Card>
            </section>

            <section className="grid lg:grid-cols-2 gap-6">
              <Card title="Cronograma" icon={<Clock className="text-primary" />}>
                <Timeline items={result.timeline} />
              </Card>

              <Card title="Checklist Executivo" icon={<CheckCircle className="text-green-400" />}>
                <List items={result.checklist} prefix="☑" />
                <div className="rounded-xl bg-black/20 border border-white/5 p-4 mt-5">
                  <p className="text-xs text-gray-400 mb-2">Próximo movimento</p>
                  <p className="text-gray-300 whitespace-pre-line">{result.nextMove || "-"}</p>
                </div>
              </Card>
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function Metric({ title, value, color = "" }: { title: string; value: string; color?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">{title}</p>
      <h2 className={`text-2xl font-bold mt-1 ${color}`}>{value}</h2>
    </div>
  )
}

function PlanCard({ title, plan, icon }: any) {
  return (
    <Card title={title} icon={icon}>
      <MiniBox label="Nome" value={plan?.name || title} />
      <MiniBox label="Objetivo" value={plan?.objective || "-"} />
      <List items={plan?.actions} prefix="➜" />
    </Card>
  )
}

function Card({ title, icon, children }: any) {
  return (
    <div className="rounded-2xl border border-[#2a2a35] bg-[#111118] p-6">
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

function List({ items, prefix }: { items?: any[]; prefix: string }) {
  const list = Array.isArray(items) ? items : []

  if (!list.length) return <p className="text-gray-500">Sem itens.</p>

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

function Timeline({ items }: { items?: any[] }) {
  const list = Array.isArray(items) ? items : []

  if (!list.length) return <p className="text-gray-500">Sem etapas.</p>

  return (
    <div className="space-y-3">
      {list.map((item, index) => (
        <div key={index} className="rounded-xl bg-black/20 border border-white/5 p-4">
          <p className="font-bold">{item.step || `Etapa ${index + 1}`}</p>
          <p className="text-xs text-gray-400 mt-1">{item.deadline || "-"}</p>
          <p className="text-gray-300 mt-2">{item.action || "-"}</p>
        </div>
      ))}
    </div>
  )
}
