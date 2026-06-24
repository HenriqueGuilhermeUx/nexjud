import { useState } from "react"
import {
  Wand2,
  FileText,
  Scale,
  ShieldAlert,
  Send,
  Gavel,
} from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { logOneClickAction } from "@/services/enterpriseModulesService"

export default function OneClickActionsCenter() {
  const { user } = useAuth()

  const [caseText, setCaseText] = useState("")
  const [loading, setLoading] = useState(false)

  async function executeAction(
    type: string,
    title: string
  ) {
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
      await logOneClickAction({
        user_id: user.id,
        action_type: type,
        title,
        payload: {
          caseText,
          createdAt: new Date().toISOString(),
        },
      })

      localStorage.setItem(
        "nexjud_draft_context",
        JSON.stringify({
          caseText,
          focus: title,
        })
      )

      window.location.href =
        "/dashboard/draft-generator"

    } catch (error) {
      console.error(error)
      alert("Erro ao executar ação.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">

        <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-indigo-500/10 to-[#05050a] p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <Wand2 className="text-primary" size={40} />

            <div>
              <h1 className="text-4xl font-bold">
                One-Click Actions™
              </h1>

              <p className="text-muted-foreground mt-1">
                Gere peças e estratégias em um clique.
              </p>
            </div>
          </div>
        </section>

        <div className="rounded-2xl border border-[#2a2a35] bg-[#111118] p-6">
          <h2 className="font-bold text-xl mb-4">
            Caso Base
          </h2>

          <textarea
            value={caseText}
            onChange={(e) =>
              setCaseText(e.target.value)
            }
            placeholder="Cole o caso..."
            className="w-full h-64 rounded-2xl bg-[#0f0f15] border border-[#2a2a35] p-5 outline-none focus:border-primary"
          />
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">

          <ActionCard
            icon={<FileText />}
            title="Gerar Petição Inicial"
            onClick={() =>
              executeAction(
                "petition",
                "Petição Inicial"
              )
            }
          />

          <ActionCard
            icon={<ShieldAlert />}
            title="Gerar Contestação"
            onClick={() =>
              executeAction(
                "defense",
                "Contestação"
              )
            }
          />

          <ActionCard
            icon={<Scale />}
            title="Gerar Recurso"
            onClick={() =>
              executeAction(
                "appeal",
                "Recurso"
              )
            }
          />

          <ActionCard
            icon={<Send />}
            title="Gerar Notificação"
            onClick={() =>
              executeAction(
                "notification",
                "Notificação Extrajudicial"
              )
            }
          />

          <ActionCard
            icon={<Gavel />}
            title="Gerar Acordo"
            onClick={() =>
              executeAction(
                "settlement",
                "Minuta de Acordo"
              )
            }
          />

          <ActionCard
            icon={<Wand2 />}
            title="Estratégia Completa"
            onClick={() =>
              executeAction(
                "strategy",
                "Estratégia Completa"
              )
            }
          />
        </div>

        {loading && (
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
            Gerando...
          </div>
        )}
      </div>
    </div>
  )
}

function ActionCard({
  icon,
  title,
  onClick,
}: any) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl border border-border bg-card p-6 text-left hover:border-primary transition-all"
    >
      <div className="mb-3 text-primary">
        {icon}
      </div>

      <h3 className="font-bold text-lg">
        {title}
      </h3>
    </button>
  )
}
