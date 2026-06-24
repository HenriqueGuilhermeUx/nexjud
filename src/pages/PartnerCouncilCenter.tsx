import { useEffect, useState } from "react"
import { Users, Scale, Flame, Brain, Loader2, FileText } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import {
  savePartnerCouncilSession,
  getPartnerCouncilSessions,
} from "@/services/enterpriseModulesService"
import { runPartnerCouncilAi } from "@/services/partnerCouncilAiService"

export default function PartnerCouncilCenter() {
  const { user } = useAuth()

  const [caseText, setCaseText] = useState("")
  const [loading, setLoading] = useState(false)
  const [sessions, setSessions] = useState<any[]>([])
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    load()
  }, [user])

  async function load() {
    if (!user?.id) return

    try {
      const data = await getPartnerCouncilSessions(user.id)
      setSessions(data || [])
    } catch (error) {
      console.error(error)
    }
  }

  function loadExample() {
    setCaseText(
      "Ação contra banco por falha na prestação de serviço, descontos indevidos e dano moral. Cliente possui extratos, protocolos de atendimento e reclamação no consumidor.gov. Banco alega contratação regular e ausência de dano comprovado."
    )
  }

  async function generateCouncil() {
    if (!user?.id) return alert("Faça login novamente.")
    if (!caseText.trim()) return alert("Cole o caso primeiro.")

    setLoading(true)

    try {
      const generated = await runPartnerCouncilAi(caseText)

      const saved = await savePartnerCouncilSession({
        user_id: user.id,
        title:
          generated.title ||
          `Partner Council - ${new Date().toLocaleDateString("pt-BR")}`,
        case_text: caseText,
        conservative_partner: generated.conservativePartner || {},
        aggressive_partner: generated.aggressivePartner || {},
        strategic_partner: generated.strategicPartner || {},
        final_vote: generated.finalVote || "ACEITARIA COM CAUTELA",
        data: {
          executiveSummary: generated.executiveSummary || "",
          recommendedPosition: generated.recommendedPosition || "",
          riskLevel: generated.riskLevel || "MÉDIO",
          generatedAt: new Date().toISOString(),
          source: "partner-council-ai",
        },
      })

      setResult(saved)
      await load()
      alert("Partner Council IA salvo.")
    } catch (error) {
      console.error(error)
      alert("Erro ao gerar Partner Council com IA.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
        <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-indigo-500/10 to-[#05050a] p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <Users className="text-primary" size={40} />
            <div>
              <h1 className="text-4xl font-bold">AI Partner Council™ IA</h1>
              <p className="text-muted-foreground mt-1">
                Três sócios IA analisando o caso: conservador, agressivo e estratégico.
              </p>
            </div>
          </div>
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          <Card title="Caso Base" icon={<FileText className="text-primary" />}>
            <textarea
              value={caseText}
              onChange={(e) => setCaseText(e.target.value)}
              placeholder="Cole aqui o caso..."
              className="w-full h-72 rounded-2xl bg-[#0f0f15] border border-[#2a2a35] p-5 outline-none focus:border-primary"
            />

            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <button
                onClick={generateCouncil}
                disabled={loading}
                className="px-6 py-4 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    GERANDO COM IA...
                  </>
                ) : (
                  <>
                    <Users size={18} />
                    GERAR CONSELHO IA
                  </>
                )}
              </button>

              <button
                onClick={loadExample}
                className="px-6 py-4 rounded-xl bg-[#171721] border border-[#2a2a35] font-bold hover:bg-[#20202b]"
              >
                Exemplo
              </button>
            </div>
          </Card>

          <Card title="Voto Final" icon={<Brain className="text-green-400" />} success>
            {result ? (
              <>
                <MiniBox
                  label="Decisão"
                  value={result.final_vote || "-"}
                  color="text-green-400"
                />

                <MiniBox
                  label="Risco"
                  value={result.data?.riskLevel || "-"}
                  color={
                    result.data?.riskLevel === "CRÍTICO"
                      ? "text-red-400"
                      : result.data?.riskLevel === "ALTO"
                      ? "text-yellow-400"
                      : "text-green-400"
                  }
                />

                {result.data?.executiveSummary && (
                  <div className="rounded-xl bg-black/20 border border-white/5 p-4 mt-4">
                    <p className="text-xs text-gray-400 mb-2">Resumo executivo</p>
                    <p className="text-gray-300 whitespace-pre-line">
                      {result.data.executiveSummary}
                    </p>
                  </div>
                )}

                {result.data?.recommendedPosition && (
                  <div className="rounded-xl bg-black/20 border border-white/5 p-4 mt-4">
                    <p className="text-xs text-gray-400 mb-2">Posição recomendada</p>
                    <p className="text-gray-300 whitespace-pre-line">
                      {result.data.recommendedPosition}
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-gray-500">O voto final aparecerá aqui.</p>
            )}
          </Card>
        </section>

        {result && (
          <section className="grid lg:grid-cols-3 gap-6">
            <Card title="Sócio Conservador" icon={<Scale className="text-yellow-400" />} warning>
              <MiniBox label="Decisão" value={result.conservative_partner?.decision || "-"} />
              <p className="text-gray-300 mt-4">{result.conservative_partner?.reason}</p>
              <List title="Preocupações" items={result.conservative_partner?.concerns} prefix="⚠️" />
              <List title="Condições" items={result.conservative_partner?.conditions} prefix="✓" />
            </Card>

            <Card title="Sócio Agressivo" icon={<Flame className="text-red-400" />} danger>
              <MiniBox label="Decisão" value={result.aggressive_partner?.decision || "-"} />
              <p className="text-gray-300 mt-4">{result.aggressive_partner?.reason}</p>
              <List title="Estratégia" items={result.aggressive_partner?.strategy} prefix="⚔️" />
              <List title="Pontos de pressão" items={result.aggressive_partner?.pressurePoints} prefix="🎯" />
            </Card>

            <Card title="Sócio Estratégico" icon={<Brain className="text-primary" />} highlight>
              <MiniBox label="Decisão" value={result.strategic_partner?.decision || "-"} />
              <p className="text-gray-300 mt-4">{result.strategic_partner?.reason}</p>
              <List title="Próximos movimentos" items={result.strategic_partner?.nextMoves} prefix="➜" />
              <div className="rounded-xl bg-black/20 border border-white/5 p-4 mt-4">
                <p className="text-xs text-gray-400 mb-2">Visão de negócio</p>
                <p className="text-gray-300">
                  {result.strategic_partner?.businessView || "-"}
                </p>
              </div>
            </Card>
          </section>
        )}

        <Card title="Histórico do Conselho" icon={<Users className="text-primary" />}>
          {sessions.length === 0 ? (
            <p className="text-gray-500">Nenhuma sessão salva ainda.</p>
          ) : (
            <div className="space-y-3">
              {sessions.slice(0, 8).map((item) => (
                <div key={item.id} className="rounded-xl bg-black/20 border border-white/5 p-4">
                  <p className="font-bold">{item.title}</p>
                  <p className="text-sm text-gray-400 mt-1">{item.final_vote}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {item.created_at
                      ? new Date(item.created_at).toLocaleString("pt-BR")
                      : "-"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
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
          : "bg-[#111118] border-[#2a2a35]"
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
    <div className="rounded-xl bg-black/20 border border-white/5 p-4 mt-3 first:mt-0">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
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

  if (!list.length) {
    return <p className="text-gray-500 mt-4">Sem itens.</p>
  }

  return (
    <div className="mt-4">
      {title && <p className="font-bold mb-2">{title}</p>}

      <ul className="space-y-2 text-gray-300">
        {list.map((item, index) => (
          <li key={index}>
            {prefix} {String(item)}
          </li>
        ))}
      </ul>
    </div>
  )
}
