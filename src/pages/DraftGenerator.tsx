import { useEffect, useState } from "react"
import {
  FileText,
  Loader2,
  Wand2,
  Copy,
  AlertTriangle,
  CheckCircle,
} from "lucide-react"
import { generateDraft } from "@/services/draftGeneratorService"
import { useAuth } from "@/context/AuthContext"
import { saveDraft } from "@/services/draftService"

export default function DraftGenerator() {
  const { user } = useAuth()

  const [caseText, setCaseText] = useState("")
  const [focus, setFocus] = useState("")
  const [draftType, setDraftType] = useState("peticao_inicial")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  useEffect(() => {
    const saved = localStorage.getItem("nexjud_draft_context")

    if (saved) {
      const parsed = JSON.parse(saved)
      setCaseText(parsed.caseText || "")
      setFocus(parsed.focus || "")
      localStorage.removeItem("nexjud_draft_context")
    }
  }, [])

  function loadExample() {
    setCaseText(
      "Ação trabalhista. Reclamante pede reconhecimento de vínculo empregatício e horas extras. Há mensagens de WhatsApp com ordens diárias, comprovantes de pagamento recorrente, testemunhas e registros de entrada. A empresa alega autonomia, ausência de exclusividade e prestação eventual."
    )

    setFocus(
      "Contra-atacar a tese de autonomia e prestação eventual, reforçando subordinação, habitualidade e onerosidade."
    )
  }

  async function handleGenerate() {
    if (!caseText.trim()) {
      alert("Cole o caso primeiro.")
      return
    }

    setLoading(true)

    try {
      const data = await generateDraft({
        caseText,
        draftType,
        focus,
      })

      setResult(data)

      if (user?.id) {
        await saveDraft({
          userId: user.id,
          title: data.title || "Minuta NexJud",
          draftType,
          caseText,
          focus,
          result: data,
        })
      }
    } catch (error) {
      console.error(error)
      alert("Erro ao gerar/salvar minuta.")
    } finally {
      setLoading(false)
    }
  }

  function copyFullDraft() {
    if (!result) return

    const text = `
${result.title || "Minuta NexJud"}

Objetivo Estratégico:
${result.strategicObjective || "-"}

Tese Central:
${result.mainThesis || "-"}

Pontos Fracos a Defender:
${(result.weakPointsToDefend || []).map((x: string) => `- ${x}`).join("\n")}

Estrutura:
${(result.structure || [])
  .map(
    (s: any, i: number) => `
${i + 1}. ${s.section}
Finalidade: ${s.purpose}
Texto sugerido:
${s.content}
`
  )
  .join("\n")}

Provas a Anexar:
${(result.evidenceToAttach || []).map((x: string) => `- ${x}`).join("\n")}

Checklist de Argumentos:
${(result.argumentChecklist || []).map((x: string) => `- ${x}`).join("\n")}

Pedidos:
${(result.closingRequests || []).map((x: string) => `- ${x}`).join("\n")}

Alertas:
${(result.riskWarnings || []).map((x: string) => `- ${x}`).join("\n")}

Observação Final:
${result.finalNote || "-"}
`

    navigator.clipboard.writeText(text)
    alert("Minuta copiada.")
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
        <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-[#111118] to-[#0c0c12] p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="text-primary" size={38} />
            <div>
              <h1 className="text-4xl font-bold">
                Gerador de Minutas de Contra-Ataque™
              </h1>
              <p className="text-gray-400 mt-1">
                Gere o esqueleto estratégico de peças focadas nos pontos fracos identificados pelo Red Team.
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-4 mt-6">
            <SelectCard
              active={draftType === "peticao_inicial"}
              label="Petição Inicial"
              onClick={() => setDraftType("peticao_inicial")}
            />
            <SelectCard
              active={draftType === "contestacao"}
              label="Contestação"
              onClick={() => setDraftType("contestacao")}
            />
            <SelectCard
              active={draftType === "recurso"}
              label="Recurso"
              onClick={() => setDraftType("recurso")}
            />
            <SelectCard
              active={draftType === "impugnacao"}
              label="Impugnação"
              onClick={() => setDraftType("impugnacao")}
            />
            <SelectCard
              active={draftType === "memoriais"}
              label="Memoriais"
              onClick={() => setDraftType("memoriais")}
            />
            <SelectCard
              active={draftType === "sustentacao_oral"}
              label="Sustentação Oral"
              onClick={() => setDraftType("sustentacao_oral")}
            />
          </div>
        </section>

        <section className="grid lg:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-[#2a2a35] bg-[#111118] p-6">
            <h2 className="font-bold text-xl mb-4">Caso-base</h2>

            <textarea
              value={caseText}
              onChange={(e) => setCaseText(e.target.value)}
              placeholder="Cole aqui o caso, petição, tese, Red Team ou resumo dos fatos..."
              className="w-full h-72 rounded-2xl bg-[#0f0f15] border border-[#2a2a35] p-5 outline-none focus:border-primary"
            />

            <h2 className="font-bold text-xl mt-6 mb-4">
              Foco estratégico
            </h2>

            <textarea
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              placeholder="Ex: defender o ponto fraco sobre prescrição, reforçar prova documental, rebater tese de autonomia..."
              className="w-full h-32 rounded-2xl bg-[#0f0f15] border border-[#2a2a35] p-5 outline-none focus:border-primary"
            />

            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="px-6 py-4 rounded-2xl bg-primary text-white font-bold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} />
                    GERANDO...
                  </>
                ) : (
                  <>
                    <Wand2 size={18} />
                    GERAR MINUTA
                  </>
                )}
              </button>

              <button
                onClick={loadExample}
                className="px-6 py-4 rounded-2xl bg-[#171721] border border-[#2a2a35] font-bold hover:bg-[#20202b]"
              >
                Usar exemplo
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-[#2a2a35] bg-[#111118] p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="font-bold text-xl">
                Resultado
              </h2>

              {result && (
                <button
                  onClick={copyFullDraft}
                  className="px-4 py-2 rounded-xl bg-primary text-white font-semibold flex items-center gap-2"
                >
                  <Copy size={16} />
                  Copiar tudo
                </button>
              )}
            </div>

            {!result ? (
              <p className="text-gray-500">
                A minuta aparecerá aqui após a geração.
              </p>
            ) : (
              <div className="space-y-6">
                <div className="rounded-xl bg-primary/10 border border-primary/20 p-5">
                  <h3 className="font-bold text-2xl mb-2">
                    {result.title}
                  </h3>

                  <p className="text-gray-300">
                    {result.strategicObjective}
                  </p>
                </div>

                <ResultBlock title="Tese Central">
                  <p>{result.mainThesis}</p>
                </ResultBlock>

                <ResultList
                  icon={<AlertTriangle className="text-red-400" />}
                  title="Pontos Fracos a Defender"
                  items={result.weakPointsToDefend}
                  prefix="❌"
                />

                <ResultBlock title="Estrutura da Peça">
                  <div className="space-y-4">
                    {(result.structure || []).map((section: any, index: number) => (
                      <div key={index} className="rounded-xl bg-[#0f0f15] border border-white/5 p-4">
                        <h4 className="font-bold mb-1">
                          {index + 1}. {section.section}
                        </h4>
                        <p className="text-sm text-gray-400 mb-3">
                          {section.purpose}
                        </p>
                        <p className="text-gray-300 whitespace-pre-line">
                          {section.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </ResultBlock>

                <ResultList
                  icon={<CheckCircle className="text-green-400" />}
                  title="Provas a Anexar"
                  items={result.evidenceToAttach}
                  prefix="✓"
                />

                <ResultList
                  title="Checklist de Argumentos"
                  items={result.argumentChecklist}
                  prefix="•"
                />

                <ResultList
                  title="Pedidos / Requerimentos"
                  items={result.closingRequests}
                  prefix="➜"
                />

                <ResultList
                  icon={<AlertTriangle className="text-yellow-400" />}
                  title="Alertas de Risco"
                  items={result.riskWarnings}
                  prefix="⚠️"
                />

                <ResultBlock title="Nota Final">
                  <p>{result.finalNote}</p>
                </ResultBlock>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function SelectCard({ active, label, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-2xl border text-left font-semibold transition ${
        active
          ? "bg-primary/10 border-primary/40 text-primary"
          : "bg-[#111118] border-[#2a2a35] text-gray-300 hover:bg-[#171721]"
      }`}
    >
      {label}
    </button>
  )
}

function ResultBlock({ title, children }: any) {
  return (
    <div className="rounded-xl border border-[#2a2a35] bg-[#0f0f15] p-5">
      <h3 className="font-bold text-lg mb-3">{title}</h3>
      <div className="text-gray-300 whitespace-pre-line">{children}</div>
    </div>
  )
}

function ResultList({ icon, title, items, prefix }: any) {
  const list = Array.isArray(items) ? items : []

  return (
    <div className="rounded-xl border border-[#2a2a35] bg-[#0f0f15] p-5">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="font-bold text-lg">{title}</h3>
      </div>

      {list.length === 0 ? (
        <p className="text-gray-500">Sem itens.</p>
      ) : (
        <ul className="space-y-2 text-gray-300">
          {list.map((item: string, index: number) => (
            <li key={index}>
              {prefix} {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
