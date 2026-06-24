import { useEffect, useState } from "react"
import {
  ShieldAlert,
  AlertTriangle,
  Target,
  FileText,
  Loader2,
  Sparkles,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import {
  saveWarRoomSession,
  getWarRoomSessions,
} from "@/services/enterpriseModulesService"

export default function WarRoomCenter() {
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
      const data = await getWarRoomSessions(user.id)
      setSessions(data || [])
    } catch (error) {
      console.error(error)
    }
  }

  function loadExample() {
    setCaseText(
      "Ação trabalhista com pedido de reconhecimento de vínculo empregatício, horas extras e danos morais. O reclamante possui mensagens de WhatsApp com ordens diárias, comprovantes de pagamento recorrente e testemunhas. A empresa sustenta autonomia, ausência de exclusividade e prestação eventual."
    )
  }

  async function generateWarRoom() {
    if (!user?.id) {
      alert("Faça login novamente.")
      return
    }

    if (!caseText.trim()) {
      alert("Cole o caso primeiro.")
      return
    }

    setLoading(true)

    try {
      const generated = {
        title: `War Room - ${new Date().toLocaleDateString("pt-BR")}`,
        risks: [
          "A parte contrária pode sustentar ausência de subordinação formal.",
          "Mensagens de WhatsApp podem ser atacadas como comunicação informal.",
          "Testemunhas podem ser contraditadas por vínculo pessoal com o reclamante.",
          "Pedido de dano moral pode ser considerado genérico se não houver prova específica.",
        ],
        opportunities: [
          "Pagamentos recorrentes reforçam habitualidade.",
          "Ordens diárias por mensagem fortalecem tese de subordinação.",
          "Registros de entrada podem demonstrar rotina de trabalho.",
          "Prova testemunhal bem preparada pode fechar lacunas documentais.",
        ],
        missingEvidence: [
          "Comprovantes completos de pagamento.",
          "Prints organizados cronologicamente.",
          "Lista de testemunhas com resumo do que cada uma comprova.",
          "Documentos ou registros de controle de entrada e saída.",
        ],
        opponentArguments: [
          "O reclamante prestava serviços de forma autônoma.",
          "Não havia exclusividade.",
          "Os pagamentos eram por demanda/evento.",
          "As mensagens não configuram poder diretivo suficiente.",
        ],
        nextMoves: [
          "Organizar linha do tempo dos fatos.",
          "Separar provas por requisito do vínculo: pessoalidade, habitualidade, onerosidade e subordinação.",
          "Preparar contradita preventiva das testemunhas.",
          "Reforçar ou retirar pedido de dano moral conforme prova disponível.",
          "Calcular cenário de acordo antes da audiência.",
        ],
      }

      const saved = await saveWarRoomSession({
        user_id: user.id,
        title: generated.title,
        case_text: caseText,
        risks: generated.risks,
        opportunities: generated.opportunities,
        missing_evidence: generated.missingEvidence,
        opponent_arguments: generated.opponentArguments,
        next_moves: generated.nextMoves,
      })

      setResult(saved)
      await load()
      alert("War Room salvo.")
    } catch (error) {
      console.error(error)
      alert("Erro ao gerar War Room.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
        <section className="rounded-3xl border border-red-900/50 bg-gradient-to-br from-red-500/10 via-[#111118] to-[#05050a] p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <ShieldAlert className="text-red-400" size={40} />
            <div>
              <h1 className="text-4xl font-bold">Litigation War Room™</h1>
              <p className="text-muted-foreground mt-1">
                Central tática para riscos, oportunidades, provas faltantes, argumentos adversários e próximos movimentos.
              </p>
            </div>
          </div>
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          <Card title="Caso Base" icon={<FileText className="text-primary" />}>
            <textarea
              value={caseText}
              onChange={(e) => setCaseText(e.target.value)}
              placeholder="Cole aqui o caso, tese, resumo dos fatos ou petição..."
              className="w-full h-72 rounded-2xl bg-[#0f0f15] border border-[#2a2a35] p-5 outline-none focus:border-primary"
            />

            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <button
                onClick={generateWarRoom}
                disabled={loading}
                className="px-6 py-4 rounded-xl bg-red-600 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    GERANDO...
                  </>
                ) : (
                  <>
                    <ShieldAlert size={18} />
                    GERAR WAR ROOM
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

          <Card title="Resultado Atual" icon={<Sparkles className="text-primary" />} highlight>
            {result ? (
              <div className="space-y-4">
                <MiniBox label="Título" value={result.title || "-"} />
                <MiniBox
                  label="Riscos"
                  value={String(result.risks?.length || 0)}
                  color="text-red-400"
                />
                <MiniBox
                  label="Próximos movimentos"
                  value={String(result.next_moves?.length || 0)}
                  color="text-green-400"
                />
              </div>
            ) : (
              <p className="text-gray-500">
                Gere um War Room para visualizar o diagnóstico tático.
              </p>
            )}
          </Card>
        </section>

        {result && (
          <>
            <section className="grid lg:grid-cols-2 gap-6">
              <Card title="Riscos Críticos" icon={<AlertTriangle className="text-red-400" />} danger>
                <List items={result.risks} prefix="🚨" />
              </Card>

              <Card title="Oportunidades" icon={<Target className="text-green-400" />} success>
                <List items={result.opportunities} prefix="✓" />
              </Card>
            </section>

            <section className="grid lg:grid-cols-3 gap-6">
              <Card title="Provas Faltantes" icon={<FileText className="text-yellow-400" />} warning>
                <List items={result.missing_evidence} prefix="📎" />
              </Card>

              <Card title="Argumentos do Adversário" icon={<ShieldAlert className="text-red-400" />} danger>
                <List items={result.opponent_arguments} prefix="⚔️" />
              </Card>

              <Card title="Próximos Movimentos" icon={<Sparkles className="text-primary" />} highlight>
                <List items={result.next_moves} prefix="➜" />
              </Card>
            </section>
          </>
        )}

        <Card title="Histórico War Room" icon={<ShieldAlert className="text-red-400" />}>
          {sessions.length === 0 ? (
            <p className="text-gray-500">Nenhuma sessão salva ainda.</p>
          ) : (
            <div className="space-y-3">
              {sessions.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl bg-black/20 border border-white/5 p-4"
                >
                  <p className="font-bold">{item.title || "War Room"}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {item.created_at
                      ? new Date(item.created_at).toLocaleString("pt-BR")
                      : "-"}
                  </p>

                  <div className="grid md:grid-cols-3 gap-3 mt-3">
                    <MiniBox label="Riscos" value={String(item.risks?.length || 0)} />
                    <MiniBox label="Oportunidades" value={String(item.opportunities?.length || 0)} />
                    <MiniBox label="Próximos passos" value={String(item.next_moves?.length || 0)} />
                  </div>
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
    <div className="rounded-xl bg-black/20 border border-white/5 p-4">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  )
}

function List({ items, prefix }: { items?: any[]; prefix: string }) {
  const list = Array.isArray(items) ? items : []

  if (!list.length) {
    return <p className="text-gray-500">Sem itens.</p>
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
