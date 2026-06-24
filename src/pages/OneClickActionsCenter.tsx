import { useState } from "react"
import {
  Wand2,
  FileText,
  Scale,
  ShieldAlert,
  Send,
  Gavel,
  Loader2,
  Copy,
  ArrowRight,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { logOneClickAction } from "@/services/enterpriseModulesService"
import { runOneClickAi } from "@/services/oneClickAiService"

export default function OneClickActionsCenter() {
  const { user } = useAuth()

  const [caseText, setCaseText] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  async function executeAction(type: string, title: string) {
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
      const generated = await runOneClickAi({
        caseText,
        actionType: type,
        actionTitle: title,
      })

      await logOneClickAction({
        user_id: user.id,
        action_type: type,
        title: generated.title || title,
        payload: {
          caseText,
          generated,
          createdAt: new Date().toISOString(),
          source: "one-click-ai",
        },
      })

      setResult(generated)

      localStorage.setItem(
        "nexjud_draft_context",
        JSON.stringify({
          caseText,
          focus: buildDraftFocus(generated),
        })
      )

      alert("Ação gerada com IA. Você pode revisar abaixo ou enviar para o Gerador de Minutas.")
    } catch (error) {
      console.error(error)
      alert("Erro ao executar ação com IA.")
    } finally {
      setLoading(false)
    }
  }

  function copyResult() {
    if (!result) return

    navigator.clipboard.writeText(buildDraftFocus(result))
    alert("Conteúdo copiado.")
  }

  function goToDraftGenerator() {
    if (!result) {
      alert("Gere uma ação primeiro.")
      return
    }

    localStorage.setItem(
      "nexjud_draft_context",
      JSON.stringify({
        caseText,
        focus: buildDraftFocus(result),
      })
    )

    window.location.href = "/dashboard/draft-generator"
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
        <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-indigo-500/10 to-[#05050a] p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <Wand2 className="text-primary" size={40} />

            <div>
              <h1 className="text-4xl font-bold">One-Click Actions™ IA</h1>

              <p className="text-muted-foreground mt-1">
                Gere peças, estratégias e minutas com IA real em um clique.
              </p>
            </div>
          </div>
        </section>

        <div className="rounded-2xl border border-[#2a2a35] bg-[#111118] p-6">
          <h2 className="font-bold text-xl mb-4">Caso Base</h2>

          <textarea
            value={caseText}
            onChange={(e) => setCaseText(e.target.value)}
            placeholder="Cole o caso..."
            className="w-full h-64 rounded-2xl bg-[#0f0f15] border border-[#2a2a35] p-5 outline-none focus:border-primary"
          />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          <ActionCard
            icon={<FileText />}
            title="Gerar Petição Inicial"
            disabled={loading}
            onClick={() => executeAction("petition", "Petição Inicial")}
          />

          <ActionCard
            icon={<ShieldAlert />}
            title="Gerar Contestação"
            disabled={loading}
            onClick={() => executeAction("defense", "Contestação")}
          />

          <ActionCard
            icon={<Scale />}
            title="Gerar Recurso"
            disabled={loading}
            onClick={() => executeAction("appeal", "Recurso")}
          />

          <ActionCard
            icon={<Send />}
            title="Gerar Notificação"
            disabled={loading}
            onClick={() => executeAction("notification", "Notificação Extrajudicial")}
          />

          <ActionCard
            icon={<Gavel />}
            title="Gerar Acordo"
            disabled={loading}
            onClick={() => executeAction("settlement", "Minuta de Acordo")}
          />

          <ActionCard
            icon={<Wand2 />}
            title="Estratégia Completa"
            disabled={loading}
            onClick={() => executeAction("strategy", "Estratégia Completa")}
          />
        </div>

        {loading && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center flex items-center justify-center gap-2">
            <Loader2 className="animate-spin" />
            Gerando com IA...
          </div>
        )}

        {result && (
          <section className="grid lg:grid-cols-2 gap-6">
            <Card title="Resultado One-Click IA" icon={<Wand2 className="text-primary" />} highlight>
              <MiniBox label="Título" value={result.title || "-"} />
              <MiniBox label="Objetivo" value={result.objective || "-"} />
              <MiniBox label="Uso recomendado" value={result.recommendedUse || "-"} />

              <div className="flex flex-col sm:flex-row gap-3 mt-5">
                <button
                  onClick={copyResult}
                  className="px-5 py-3 rounded-xl bg-[#171721] border border-[#2a2a35] font-bold flex items-center justify-center gap-2"
                >
                  <Copy size={18} />
                  Copiar
                </button>

                <button
                  onClick={goToDraftGenerator}
                  className="px-5 py-3 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2"
                >
                  <ArrowRight size={18} />
                  Enviar para Minutas
                </button>
              </div>
            </Card>

            <Card title="Notas Estratégicas" icon={<ShieldAlert className="text-yellow-400" />} warning>
              <List title="Notas" items={result.strategicNotes} prefix="✓" />
              <List title="Riscos" items={result.risks} prefix="⚠️" />
              <List title="Próximos passos" items={result.nextSteps} prefix="➜" />
            </Card>

            <Card title="Documento Gerado" icon={<FileText className="text-primary" />} highlight>
              <p className="text-gray-300 whitespace-pre-line">
                {result.document?.opening || "-"}
              </p>

              <div className="space-y-4 mt-5">
                {(result.document?.sections || []).map((section: any, index: number) => (
                  <div key={index} className="rounded-xl bg-black/20 border border-white/5 p-4">
                    <h3 className="font-bold text-primary mb-2">
                      {section.title || `Seção ${index + 1}`}
                    </h3>
                    <p className="text-gray-300 whitespace-pre-line">
                      {section.content || "-"}
                    </p>
                  </div>
                ))}
              </div>

              <p className="text-gray-300 whitespace-pre-line mt-5">
                {result.document?.closing || "-"}
              </p>
            </Card>
          </section>
        )}
      </div>
    </div>
  )
}

function buildDraftFocus(result: any) {
  const sections = Array.isArray(result?.document?.sections)
    ? result.document.sections
        .map(
          (s: any, index: number) =>
            `${index + 1}. ${s.title || "Seção"}\n${s.content || ""}`
        )
        .join("\n\n")
    : ""

  return `
${result?.title || "One-Click Action NexJud"}

Objetivo:
${result?.objective || "-"}

Uso recomendado:
${result?.recommendedUse || "-"}

Abertura:
${result?.document?.opening || "-"}

Estrutura:
${sections || "-"}

Fechamento:
${result?.document?.closing || "-"}

Notas estratégicas:
${(result?.strategicNotes || []).map((x: string) => `- ${x}`).join("\n")}

Riscos:
${(result?.risks || []).map((x: string) => `- ${x}`).join("\n")}

Próximos passos:
${(result?.nextSteps || []).map((x: string) => `- ${x}`).join("\n")}
`.trim()
}

function ActionCard({ icon, title, onClick, disabled }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-2xl border border-border bg-card p-6 text-left hover:border-primary transition-all disabled:opacity-50"
    >
      <div className="mb-3 text-primary">{icon}</div>

      <h3 className="font-bold text-lg">{title}</h3>
    </button>
  )
}

function Card({ title, icon, children, highlight, warning }: any) {
  return (
    <div
      className={`rounded-2xl border p-6 ${
        highlight
          ? "bg-gradient-to-r from-primary/10 to-indigo-500/10 border-primary/30"
          : warning
          ? "bg-[#111118] border-yellow-900/70"
          : "bg-[#111118] border-[#2a2a35]"
      }`}
    >
      <div className={`flex items-center gap-2 mb-4 ${warning ? "text-yellow-400" : ""}`}>
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
}: {
  label: string
  value: string
}) {
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
