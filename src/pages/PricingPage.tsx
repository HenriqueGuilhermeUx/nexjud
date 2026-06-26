import { useState } from "react"
import { Check, Crown, Sparkles, Shield, Zap, Copy, Loader2 } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { PlanType } from "@/services/subscriptionService"
import { createPixCheckout } from "@/services/paymentService"

const plans = [
  {
    id: "pro",
    name: "NexJud Pro",
    price: "R$ 197/mês",
    icon: Zap,
    description: "Para advogados autônomos começarem com IA jurídica.",
    features: ["Strategic Analysis", "Judge Simulator", "Draft Generator", "Red Team", "Carteira Processual", "Histórico"],
  },
  {
    id: "intelligence",
    name: "NexJud Intelligence",
    price: "R$ 397/mês",
    icon: Sparkles,
    description: "Para quem quer inteligência jurídica completa.",
    featured: true,
    features: ["Tudo do Pro", "Legal Intelligence Engine", "War Room", "Partner Council", "Opponent Intelligence", "Tribunal Heatmap", "Board Report", "PDF Executivo"],
  },
  {
    id: "enterprise",
    name: "NexJud Enterprise",
    price: "R$ 797/mês",
    icon: Shield,
    description: "Para escritórios que querem gestão e estratégia avançada.",
    features: ["Tudo do Intelligence", "Litigation Strategy AI", "Enterprise Analytics", "Agenda Jurídica IA", "Alertas Inteligentes", "Módulos executivos"],
  },
  {
    id: "enterprise_plus",
    name: "Enterprise Plus",
    price: "R$ 1.497/mês",
    icon: Crown,
    description: "Para operação multiusuário e customizações.",
    features: ["Tudo do Enterprise", "Multiempresa", "Equipe e permissões", "API", "White Label", "Suporte prioritário"],
  },
]

export default function PricingPage() {
  const { user } = useAuth()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [checkout, setCheckout] = useState<any>(null)
  const [taxId, setTaxId] = useState("")

  async function choosePlan(plan: PlanType) {
    if (!user?.id || !user?.email) {
      alert("Faça login novamente.")
      return
    }

    setLoadingPlan(plan)

    try {
      const data = await createPixCheckout({
        userId: user.id,
        plan,
        customerEmail: user.email,
        customerName: user.email,
        taxId,
      })

      setCheckout({
        plan,
        ...data,
      })

      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (error: any) {
      console.error(error)
      alert(error.message || "Erro ao gerar Pix.")
    } finally {
      setLoadingPlan(null)
    }
  }

  function copyPix() {
    const code = checkout?.brCode || checkout?.order?.br_code || ""

    if (!code) {
      alert("Código Pix não encontrado.")
      return
    }

    navigator.clipboard.writeText(code)
    alert("Pix copia e cola copiado.")
  }

  function goDashboard() {
    alert("Se o pagamento já foi confirmado pelo webhook, seu plano será ativado automaticamente.")
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

        {checkout && (
          <section className="rounded-3xl border border-green-500/30 bg-green-500/5 p-6">
            <h2 className="text-2xl font-bold text-green-400">Pix gerado com sucesso</h2>
            <p className="text-muted-foreground mt-2">
              Pague o Pix abaixo. Quando o webhook da Woovi confirmar, seu plano será ativado automaticamente.
            </p>

            <div className="grid lg:grid-cols-2 gap-6 mt-6">
              <div className="rounded-2xl bg-black/20 border border-white/5 p-5">
                <p className="text-sm text-gray-400 mb-2">Plano</p>
                <p className="text-xl font-bold">{checkout.plan}</p>

                <p className="text-sm text-gray-400 mt-5 mb-2">Pix copia e cola</p>
                <textarea
                  readOnly
                  value={checkout.brCode || checkout.order?.br_code || ""}
                  className="w-full h-32 rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4 text-sm"
                />

                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  <button
                    onClick={copyPix}
                    className="px-5 py-3 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2"
                  >
                    <Copy size={18} />
                    Copiar Pix
                  </button>

                  <button
                    onClick={goDashboard}
                    className="px-5 py-3 rounded-xl bg-[#171721] border border-border font-bold"
                  >
                    Já paguei
                  </button>
                </div>
              </div>

              <div className="rounded-2xl bg-black/20 border border-white/5 p-5 flex items-center justify-center">
                {checkout.qrCodeImage || checkout.order?.qr_code_image ? (
                  <img
                    src={checkout.qrCodeImage || checkout.order?.qr_code_image}
                    alt="QR Code Pix"
                    className="max-w-xs rounded-xl bg-white p-3"
                  />
                ) : checkout.paymentLink || checkout.order?.payment_link ? (
                  <a
                    href={checkout.paymentLink || checkout.order?.payment_link}
                    target="_blank"
                    rel="noreferrer"
                    className="px-5 py-3 rounded-xl bg-primary text-white font-bold"
                  >
                    Abrir link de pagamento
                  </a>
                ) : (
                  <p className="text-gray-500 text-center">
                    QR Code não retornado pela Woovi. Use o Pix copia e cola.
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-border bg-card p-5">
          <label className="text-sm font-medium text-muted-foreground">
            CPF/CNPJ para emissão do Pix, opcional
          </label>
          <input
            value={taxId}
            onChange={(e) => setTaxId(e.target.value)}
            placeholder="Digite CPF ou CNPJ"
            className="mt-2 w-full rounded-xl bg-[#0f0f15] border border-[#2a2a35] p-4 outline-none focus:border-primary"
          />
        </section>

        <section className="grid lg:grid-cols-4 gap-5">
          {plans.map((plan) => {
            const Icon = plan.icon
            const isLoading = loadingPlan === plan.id

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
                    {plan.featured && <p className="text-xs text-primary font-bold">MAIS RECOMENDADO</p>}
                  </div>
                </div>

                <p className="text-3xl font-bold">{plan.price}</p>
                <p className="text-sm text-muted-foreground mt-3 min-h-[60px]">{plan.description}</p>

                <button
                  onClick={() => choosePlan(plan.id as PlanType)}
                  disabled={!!loadingPlan}
                  className={`w-full mt-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 ${
                    plan.featured ? "bg-primary text-white" : "bg-[#171721] border border-border"
                  }`}
                >
                  {isLoading ? <Loader2 className="animate-spin" size={18} /> : null}
                  {isLoading ? "Gerando Pix..." : "Assinar com Pix"}
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
