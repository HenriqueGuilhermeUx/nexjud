import { ArrowRight, Brain, Database, FileText, Gavel, ShieldAlert, Sparkles } from "lucide-react"
import { useNavigate } from "react-router-dom"

const steps = [
  {
    icon: Brain,
    title: "1. Comece pela análise estratégica",
    text: "Cole um caso, tese, petição ou número CNJ. O NexJud gera score, riscos, tese vencedora e próximos movimentos.",
  },
  {
    icon: Database,
    title: "2. Use CNJ/DataJud",
    text: "Busque processos reais pelo número CNJ e alimente a IA com dados oficiais.",
  },
  {
    icon: Gavel,
    title: "3. Simule o juiz",
    text: "Use o Judge Simulator para prever pontos favoráveis, riscos e provável decisão.",
  },
  {
    icon: ShieldAlert,
    title: "4. Abra o War Room",
    text: "Monte plano de ataque, defesa, provas, negociação e ações urgentes.",
  },
  {
    icon: FileText,
    title: "5. Gere documentos",
    text: "Transforme a análise em minuta, petição, recurso, acordo ou relatório executivo.",
  },
]

export default function Tutorial() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-6xl mx-auto p-6 lg:p-10 space-y-8">
        <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-indigo-500/10 to-[#05050a] p-8">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="text-primary" size={38} />
            <h1 className="text-4xl font-bold">Tutorial NexJud</h1>
          </div>

          <p className="text-muted-foreground text-lg">
            Em poucos passos, entenda como usar a plataforma para analisar, decidir e produzir documentos jurídicos com IA.
          </p>
        </section>

        <section className="grid lg:grid-cols-2 gap-5">
          {steps.map((step) => {
            const Icon = step.icon

            return (
              <div key={step.title} className="rounded-2xl border border-border bg-card p-6">
                <Icon className="text-primary mb-4" size={32} />
                <h2 className="text-xl font-bold">{step.title}</h2>
                <p className="text-muted-foreground mt-3">{step.text}</p>
              </div>
            )
          })}
        </section>

        <div className="grid md:grid-cols-2 gap-4">
         
         onClick={() => {
  localStorage.setItem("nexjud_onboarding", "done")
  navigate("/dashboard")
}}

    navigate("/dashboard")

  }}
            className="py-4 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2"
          >
            Começar análise
            <ArrowRight size={18} />
          </button>

          <button
            onClick={() => navigate("/pricing")}
            className="py-4 rounded-xl bg-[#171721] border border-border font-bold"
          >
            Ver planos
          </button>
        </div>
      </div>
    </div>
  )
}
