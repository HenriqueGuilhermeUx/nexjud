import { Check, Crown, Sparkles, Shield, Zap } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { updateSubscriptionPlan, PlanType } from "@/services/subscriptionService"

const plans = [
  {
    id: "pro",
    name: "NexJud Pro",
    price: "R$ 197/mês",
    icon: Zap,
    description: "Para advogados autônomos começarem com IA jurídica.",
    features: [
      "Strategic Analysis",
      "Judge Simulator",
      "Draft Generator",
      "Red Team",
      "Carteira Processual",
      "Histórico",
    ],
  },
  {
    id: "intelligence",
    name: "NexJud Intelligence",
    price: "R$ 397/mês",
    icon: Sparkles,
    description: "Para quem quer inteligência jurídica completa.",
    featured: true,
    features: [
      "Tudo do Pro",
      "Legal Intelligence Engine",
      "War Room",
      "Partner Council",
      "Opponent Intelligence",
      "Tribunal Heatmap",
      "Board Report",
      "PDF Executivo",
    ],
  },
  {
    id: "enterprise",
    name: "NexJud Enterprise",
    price: "R$ 797/mês",
    icon: Shield,
    description: "Para escritórios que querem gestão e estratégia avançada.",
    features: [
      "Tudo do Intelligence",
      "Litigation Strategy AI",
      "Enterprise Analytics",
      "Agenda Jurídica IA",
      "Alertas Inteligentes",
      "Módulos executivos",
    ],
  },
  {
    id: "enterprise_plus",
    name: "Enterprise Plus",
    price: "R$ 1.497/mês",
    icon: Crown,
    description: "Para operação multiusuário e customizações.",
    features: [
      "Tudo do Enterprise",
      "Multiempresa",
      "Equipe e permissões",
      "API",
      "White Label",
      "Suporte prioritário",
    ],
  },
]

export default function PricingPage() {
  const { user } = useAuth()

  async function choosePlan(plan: PlanType) {
    if (!user?.id) {
      alert("Faça login novamente.")
      return
    }

    await updateSubscriptionPlan(user.id, plan, "active")
    alert("Plano ativado em modo interno. Amanhã ligamos Woovi/EFI.")
    window.location.href = "/dashboard"
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-7xl mx-auto p-6 lg:p-10 space-y-8">
        <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/10 via-indigo-500/10 to-[#05050a] p-8 text-center">
          <h1 className="text-4xl font-bold">Escolha seu plano NexJud</h1>
          <p className="text-muted-foreground mt-3 max-w-3xl mx-auto">
            Comece com 7 dias grátis. Depois escolha o nível de inteligência jurídica ideal para sua operação.
          </p>
        </section>

        <section className="grid lg:grid-cols-4 gap-5">
          {plans.map((plan) => {
            const Icon = plan.icon

            return (
              <div
                key={plan.id}
                className={`rounded-3xl border p-6 bg-card ${
                  plan.featured ? "border-primary shadow-2xl scale-[1.02]" : "border-border"
                }`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="text-primary" />
                  </div>
                  <div>
                    <h2 className="font-bold text-xl">{plan.name}</h2>
                    {plan.featured && (
                      <p className="text-xs text-primary font-bold">MAIS RECOMENDADO</p>
                    )}
                  </div>
                </div>

                <p className="text-3xl font-bold">{plan.price}</p>
                <p className="text-sm text-muted-foreground mt-3 min-h-[60px]">
                  {plan.description}
                </p>

                <button
                  onClick={() => choosePlan(plan.id as PlanType)}
                  className={`w-full mt-6 py-3 rounded-xl font-bold ${
                    plan.featured
                      ? "bg-primary text-white"
                      : "bg-[#171721] border border-border"
                  }`}
                >
                  Escolher plano
                </button>

                <ul className="space-y-3 mt-6 text-sm text-gray-300">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </section>
      </div>
    </div>
  )
}
