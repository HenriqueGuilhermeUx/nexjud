import { useState } from "react"
import {
  Gavel,
  Send,
  Loader2,
  Scale,
  AlertTriangle,
  Target,
} from "lucide-react"
import { runJudgeSimulator } from "@/services/judgeSimulatorService"
import { useAuth } from "@/context/AuthContext"
import { saveJudgeSession } from "@/services/judgeSessionService"

export default function JudgeSimulator() {
  const { user } = useAuth()

  const [caseText, setCaseText] = useState("")
  const [argument, setArgument] = useState("")
  const [hearingType, setHearingType] = useState("audiencia")
  const [difficulty, setDifficulty] = useState("alta")
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<any[]>([])

  function loadExample() {
    setCaseText(
      "Ação trabalhista. Reclamante busca reconhecimento de vínculo empregatício e horas extras. Há mensagens de WhatsApp com ordens diárias, comprovantes de pagamento mensal e testemunhas. A empresa afirma autonomia, ausência de exclusividade e prestação eventual."
    )

    setArgument(
      "Excelência, a subordinação está demonstrada pelas ordens diárias em mensagens de WhatsApp, pelos pagamentos mensais e pela habitualidade da prestação de serviços."
    )
  }

  async function handleSend() {
    if (!caseText.trim()) {
      alert("Cole o caso primeiro.")
      return
    }

    if (!argument.trim()) {
      alert("Digite sua sustentação ou argumento.")
      return
    }

    const userEntry = {
      type: "lawyer",
      content: argument,
    }

    const nextHistory = [...history, userEntry]
    setHistory(nextHistory)
    setArgument("")
    setLoading(true)

    try {
      const result = await runJudgeSimulator({
        caseText,
        userArgument: argument,
        hearingType,
        difficulty,
        history: nextHistory,
      })

      const finalHistory = [
        ...nextHistory,
        {
          type: "judge",
          content: result.judgeReply,
          meta: result,
        },
      ]

      setHistory(finalHistory)

      if (user?.id) {
        await saveJudgeSession({
          userId: user.id,
          title: `Judge Simulator ${new Date().toLocaleDateString("pt-BR")}`,
          caseText,
          hearingType,
          difficulty,
          history: finalHistory,
          lastScore: Number(result.performanceScore || 0),
        })
      }
    } catch (error) {
      console.error(error)
      alert("Erro ao simular/salvar juiz.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
        <section className="rounded-3xl border border-yellow-900/40 bg-gradient-to-br from-[#111118] to-[#0c0c12] p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <Gavel className="text-yellow-400" size={38} />
            <div>
              <h1 className="text-4xl font-bold">Judge Simulator™</h1>
              <p className="text-gray-400 mt-1">
                Treine sua audiência ou sustentação oral contra um juiz exigente.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-4 gap-4 mt-6">
            <SelectButton active={hearingType === "audiencia"} label="Audiência" onClick={() => setHearingType("audiencia")} />
            <SelectButton active={hearingType === "sustentacao"} label="Sustentação Oral" onClick={() => setHearingType("sustentacao")} />
            <SelectButton active={hearingType === "julgamento"} label="Julgamento" onClick={() => setHearingType("julgamento")} />
            <SelectButton active={hearingType === "negociacao"} label="Negociação" onClick={() => setHearingType("negociacao")} />
          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-4">
            <SelectButton active={difficulty === "media"} label="Pressão média" onClick={() => setDifficulty("media")} />
            <SelectButton active={difficulty === "alta"} label="Pressão alta" onClick={() => setDifficulty("alta")} />
            <SelectButton active={difficulty === "extrema"} label="Pressão extrema" onClick={() => setDifficulty("extrema")} />
          </div>
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-[#2a2a35] bg-[#111118] p-6">
            <h2 className="font-bold text-xl mb-4">Caso-base</h2>

            <textarea
              value={caseText}
              onChange={(e) => setCaseText(e.target.value)}
              placeholder="Cole aqui o caso, tese ou fatos relevantes..."
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
            <h2 className="font-bold text-xl mb-4">Simulação com Juiz</h2>

            <div className="h-64 overflow-y-auto rounded-2xl bg-[#0f0f15] border border-[#2a2a35] p-4 space-y-4">
              {history.length === 0 ? (
                <p className="text-gray-500">
                  Digite sua sustentação abaixo. O juiz irá interromper, questionar e avaliar.
                </p>
              ) : (
                history.map((item, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl border ${
                      item.type === "lawyer"
                        ? "bg-primary/10 border-primary/20"
                        : "bg-yellow-500/10 border-yellow-500/20"
                    }`}
                  >
                    <p className="text-xs text-gray-400 mb-2">
                      {item.type === "lawyer" ? "Advogado" : "Juiz"}
                    </p>

                    <p className="text-gray-200 whitespace-pre-line">
                      {item.content}
                    </p>

                    {item.meta && (
                      <div className="mt-4 space-y-3">
                        <InfoBox label="Nota" value={`${item.meta.performanceScore || 0}/100`} />
                        <InfoBox label="Fragilidade" value={item.meta.detectedWeakness || "-"} />
                        <InfoBox label="Fundamento exigido" value={item.meta.requestedFoundation || "-"} />

                        <ResultList title="Perguntas difíceis" items={item.meta.hardQuestions} icon={<AlertTriangle className="text-yellow-400" />} />
                        <ResultList title="Interrupções" items={item.meta.interruptions} icon={<Scale className="text-primary" />} />

                        <div className="rounded-xl bg-black/20 border border-white/5 p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Target className="text-green-400" />
                            <h3 className="font-bold">Melhoria recomendada</h3>
                          </div>
                          <p className="text-gray-300">{item.meta.improvementAdvice}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-3 mt-4">
              <textarea
                value={argument}
                onChange={(e) => setArgument(e.target.value)}
                placeholder="Digite sua sustentação ou resposta ao juiz..."
                className="flex-1 h-24 rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4 outline-none focus:border-primary"
              />

              <button
                onClick={handleSend}
                disabled={loading}
                className="w-16 rounded-xl bg-primary text-white flex items-center justify-center disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Send />}
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function SelectButton({ active, label, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-2xl border font-semibold transition ${
        active
          ? "bg-yellow-500/10 border-yellow-500/40 text-yellow-400"
          : "bg-[#111118] border-[#2a2a35] text-gray-300 hover:bg-[#171721]"
      }`}
    >
      {label}
    </button>
  )
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-black/20 border border-white/5 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-bold text-gray-200">{value}</p>
    </div>
  )
}

function ResultList({ title, items, icon }: any) {
  const list = Array.isArray(items) ? items : []

  return (
    <div className="rounded-xl bg-black/20 border border-white/5 p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="font-bold">{title}</h3>
      </div>

      {list.length === 0 ? (
        <p className="text-gray-500">Sem itens.</p>
      ) : (
        <ul className="space-y-2 text-gray-300">
          {list.map((item: string, index: number) => (
            <li key={index}>• {item}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
