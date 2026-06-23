import { useState } from "react"
import {
  ShieldAlert,
  Send,
  Loader2,
  Gavel,
  Scale,
  UserRound,
  AlertTriangle,
} from "lucide-react"
import { runRedTeamSimulator } from "@/services/redTeamSimulatorService"

export default function RedTeamSimulator() {
  const [caseText, setCaseText] = useState("")
  const [message, setMessage] = useState("")
  const [role, setRole] = useState("advogado_adversario")
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<any[]>([])

  function loadExample() {
    setCaseText(
      "Ação trabalhista. Reclamante pede reconhecimento de vínculo empregatício e horas extras. Há mensagens de WhatsApp com ordens diárias, pagamentos mensais, testemunhas e registros de entrada. A empresa sustenta autonomia, ausência de exclusividade e prestação eventual."
    )

    setMessage(
      "Excelência, a subordinação está demonstrada pelas mensagens de WhatsApp com ordens diárias e pelos pagamentos mensais recorrentes."
    )
  }

  async function handleSend() {
    if (!caseText.trim()) {
      alert("Cole o caso primeiro.")
      return
    }

    if (!message.trim()) {
      alert("Digite seu argumento.")
      return
    }

    setLoading(true)

    const userEntry = {
      type: "user",
      content: message,
    }

    const nextHistory = [...history, userEntry]
    setHistory(nextHistory)
    setMessage("")

    try {
      const result = await runRedTeamSimulator({
        caseText,
        userMessage: message,
        role,
        history: nextHistory,
      })

      setHistory([
        ...nextHistory,
        {
          type: "ai",
          content: result.reply,
          meta: result,
        },
      ])
    } catch (error) {
      console.error(error)
      alert("Erro ao simular Red Team.")
    } finally {
      setLoading(false)
    }
  }

  const roleLabel =
    role === "juiz"
      ? "Juiz"
      : role === "promotor"
      ? "Promotor"
      : role === "procurador_fazenda"
      ? "Procurador da Fazenda"
      : "Advogado adversário"

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
        <section className="rounded-3xl border border-red-900/40 bg-gradient-to-br from-[#111118] to-[#0c0c12] p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <ShieldAlert className="text-red-400" size={38} />
            <div>
              <h1 className="text-4xl font-bold">Red Team Simulator™</h1>
              <p className="text-gray-400 mt-1">
                Treine audiência, sustentação oral e negociação contra uma IA que ataca sua tese.
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-4 gap-4 mt-6">
            <RoleButton
              active={role === "advogado_adversario"}
              icon={<UserRound size={18} />}
              label="Advogado adversário"
              onClick={() => setRole("advogado_adversario")}
            />

            <RoleButton
              active={role === "juiz"}
              icon={<Gavel size={18} />}
              label="Juiz"
              onClick={() => setRole("juiz")}
            />

            <RoleButton
              active={role === "promotor"}
              icon={<Scale size={18} />}
              label="Promotor"
              onClick={() => setRole("promotor")}
            />

            <RoleButton
              active={role === "procurador_fazenda"}
              icon={<AlertTriangle size={18} />}
              label="Procurador Fazenda"
              onClick={() => setRole("procurador_fazenda")}
            />
          </div>
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-[#2a2a35] bg-[#111118] p-6">
            <h2 className="font-bold text-xl mb-4">Caso-base</h2>

            <textarea
              value={caseText}
              onChange={(e) => setCaseText(e.target.value)}
              placeholder="Cole aqui o resumo do caso, tese, petição ou fatos relevantes..."
              className="w-full h-64 rounded-2xl bg-[#0f0f15] border border-[#2a2a35] p-5 outline-none focus:border-primary"
            />

            <button
              onClick={loadExample}
              className="mt-4 px-5 py-3 rounded-xl bg-[#171721] border border-[#2a2a35] font-semibold hover:bg-[#20202b]"
            >
              Usar exemplo
            </button>
          </div>

          <div className="rounded-2xl border border-[#2a2a35] bg-[#111118] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-xl">Simulação</h2>
              <span className="text-xs px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                Modo: {roleLabel}
              </span>
            </div>

            <div className="h-64 overflow-y-auto rounded-2xl bg-[#0f0f15] border border-[#2a2a35] p-4 space-y-4">
              {history.length === 0 ? (
                <p className="text-gray-500">
                  Digite seu argumento abaixo. A IA vai pressionar sua tese.
                </p>
              ) : (
                history.map((item, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl ${
                      item.type === "user"
                        ? "bg-primary/10 border border-primary/20"
                        : "bg-red-500/10 border border-red-500/20"
                    }`}
                  >
                    <p className="text-xs text-gray-400 mb-2">
                      {item.type === "user" ? "Você" : roleLabel}
                    </p>

                    <p className="text-gray-200 whitespace-pre-line">
                      {item.content}
                    </p>

                    {item.meta && (
                      <div className="mt-4 grid md:grid-cols-3 gap-3 text-xs">
                        <InfoBox
                          label="Pressão"
                          value={item.meta.pressureLevel || "-"}
                        />
                        <InfoBox
                          label="Ponto fraco"
                          value={item.meta.weakPointDetected || "-"}
                        />
                        <InfoBox
                          label="Nota"
                          value={`${item.meta.score || 0}/100`}
                        />
                      </div>
                    )}

                    {item.meta?.suggestedImprovement && (
                      <div className="mt-3 text-sm text-yellow-300">
                        Sugestão: {item.meta.suggestedImprovement}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-3 mt-4">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Digite seu argumento ou resposta..."
                className="flex-1 h-24 rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4 outline-none focus:border-primary"
              />

              <button
                onClick={handleSend}
                disabled={loading}
                className="w-16 rounded-xl bg-primary text-white flex items-center justify-center disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Send />
                )}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function RoleButton({ active, icon, label, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-2xl border flex items-center gap-3 font-semibold transition ${
        active
          ? "bg-red-500/10 border-red-500/40 text-red-400"
          : "bg-[#111118] border-[#2a2a35] text-gray-300 hover:bg-[#171721]"
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-black/20 rounded-lg p-2 border border-white/5">
      <p className="text-gray-500">{label}</p>
      <p className="font-bold text-gray-200 truncate">{value}</p>
    </div>
  )
}
