import { Link } from "react-router-dom"
import {
  ArrowRight,
  Brain,
  CheckCircle,
  Crown,
  Database,
  FileText,
  Gavel,
  ShieldAlert,
  Sparkles,
  Target,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"

export default function Landing() {
  const { user } = useAuth()

  const ctaLink = user ? "/dashboard" : "/login"
  const ctaLabel = user ? "Acessar Plataforma" : "Começar Trial Grátis"

  const modules = [
    "Strategic Analysis",
    "Judge Simulator",
    "Draft Generator",
    "Legal Intelligence Engine",
    "Litigation Strategy AI",
    "War Room",
    "Partner Council",
    "Opponent Intelligence",
    "Tribunal Heatmap",
    "Board Report",
  ]

  const plans = [
    {
      name: "NexJud Pro",
      price: "R$ 197/mês",
      desc: "Para advogados autônomos.",
      items: ["Strategic Analysis", "Judge Simulator", "Draft Generator", "Carteira Processual"],
    },
    {
      name: "NexJud Intelligence",
      price: "R$ 397/mês",
      desc: "Para advogados que querem IA estratégica completa.",
      featured: true,
      items: ["Legal Intelligence Engine", "War Room", "Partner Council", "Opponent DB", "Board Report"],
    },
    {
      name: "NexJud Enterprise",
      price: "R$ 797/mês",
      desc: "Para escritórios e operações jurídicas.",
      items: ["Litigation Strategy AI", "Analytics", "Agenda IA", "Alertas", "Módulos executivos"],
    },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#1e293b] bg-[#0a0a0f]/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#6366f1] to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">⚖</span>
            </div>
            <div>
              <span className="text-xl font-bold">NexJud</span>
              <p className="text-xs text-gray-400">Legal Intelligence Platform</p>
            </div>
          </div>

          <Link to={ctaLink}>
            <Button className="gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white">
              {ctaLabel}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </nav>

      <section className="pt-36 pb-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#6366f1]/20 via-transparent to-transparent" />

        <div className="relative max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#6366f1]/10 border border-[#6366f1]/20 mb-6">
            <Sparkles className="w-4 h-4 text-[#22d3ee]" />
            <span className="text-sm text-gray-300">7 dias grátis para testar o NexJud Enterprise</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            O sistema operacional de
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#22d3ee]">
              inteligência jurídica com IA.
            </span>
          </h1>

          <p className="text-xl text-gray-400 max-w-4xl mx-auto mb-10">
            Cole um caso uma vez. O NexJud analisa risco, tese, juiz, adversário,
            estratégia, provas, negociação, relatório executivo e gera documentos.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link to={ctaLink}>
              <Button size="lg" className="gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white">
                {ctaLabel}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>

            <a href="#planos">
              <Button size="lg" variant="outline" className="gap-2 border-[#334155] text-white hover:bg-[#111827]">
                Ver planos
              </Button>
            </a>
          </div>

          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <Metric value="10+" label="módulos de IA" />
            <Metric value="60s" label="do caso ao relatório" />
            <Metric value="7 dias" label="trial premium" />
            <Metric value="3" label="planos comerciais" />
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-[#0f0f14]">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#22d3ee]/10 border border-[#22d3ee]/20 mb-6">
              <Brain className="w-4 h-4 text-[#22d3ee]" />
              <span className="text-sm text-gray-300">Como funciona</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              De texto bruto para decisão estratégica.
            </h2>

            <p className="text-gray-400 text-lg mb-8">
              O advogado cola o caso, busca o processo no CNJ/DataJud ou descreve a tese.
              A IA organiza tudo em análise, estratégia e execução.
            </p>

            <Link to={ctaLink}>
              <Button size="lg" className="gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white">
                Testar agora
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="space-y-4">
            {[
              "Cole o caso, tese, petição ou número CNJ",
              "A IA analisa risco, chance, tese e estratégia",
              "O War Room simula ataque, defesa e negociação",
              "O Board Report resume para sócio ou cliente",
              "O Draft Generator transforma análise em documento",
            ].map((step, index) => (
              <div key={step} className="flex gap-4 rounded-2xl border border-[#1e293b] bg-[#121218] p-5">
                <div className="w-10 h-10 rounded-full bg-[#6366f1]/10 flex items-center justify-center shrink-0">
                  <span className="font-bold text-[#6366f1]">{index + 1}</span>
                </div>
                <p className="text-gray-300">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Uma suíte completa de inteligência jurídica.
            </h2>
            <p className="text-gray-400 text-lg">
              Do primeiro diagnóstico ao relatório executivo.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
            {modules.map((item) => (
              <div key={item} className="rounded-2xl border border-[#1e293b] bg-[#121218] p-5">
                <CheckCircle className="text-green-400 mb-3" />
                <p className="font-bold">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="planos" className="py-20 px-4 bg-[#0f0f14]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Planos NexJud</h2>
            <p className="text-gray-400 text-lg">Comece com trial grátis. Escolha depois o nível ideal.</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-3xl border p-8 bg-[#121218] ${
                  plan.featured ? "border-[#6366f1] scale-[1.02] shadow-2xl" : "border-[#1e293b]"
                }`}
              >
                {plan.featured && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6366f1]/10 text-[#a5b4fc] text-xs font-bold mb-4">
                    <Crown size={14} />
                    MAIS RECOMENDADO
                  </div>
                )}

                <h3 className="text-2xl font-bold">{plan.name}</h3>
                <p className="text-gray-400 mt-2 min-h-[48px]">{plan.desc}</p>
                <p className="text-4xl font-bold mt-6">{plan.price}</p>

                <Link to="/pricing">
                  <Button className="w-full mt-6 bg-[#6366f1] hover:bg-[#5558e3] text-white">
                    Escolher plano
                  </Button>
                </Link>

                <ul className="space-y-3 mt-6">
                  {plan.items.map((item) => (
                    <li key={item} className="flex gap-2 text-gray-300">
                      <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-1" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto rounded-3xl border border-[#6366f1]/30 bg-gradient-to-r from-[#6366f1]/20 to-[#22d3ee]/10 p-10 text-center">
          <Zap className="mx-auto text-[#22d3ee] mb-4" size={44} />
          <h2 className="text-4xl font-bold mb-4">Pronto para testar o NexJud?</h2>
          <p className="text-gray-300 text-lg mb-8">
            Comece com 7 dias grátis e veja como a IA pode acelerar análise,
            estratégia e produção jurídica.
          </p>

          <Link to={ctaLink}>
            <Button size="lg" className="gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white">
              {ctaLabel}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#1e293b] py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-bold">⚖ NexJud</span>
          <p className="text-sm text-gray-400">© 2026 NexJud. Todos os direitos reservados.</p>
          <p className="text-xs text-gray-500">Apoio estratégico. A decisão jurídica final é do advogado.</p>
        </div>
      </footer>
    </div>
  )
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-[#1e293b] bg-[#121218] p-6">
      <div className="text-4xl font-bold text-[#6366f1] mb-1">{value}</div>
      <div className="text-sm text-gray-400">{label}</div>
    </div>
  )
}
