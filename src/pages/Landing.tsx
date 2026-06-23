import { Link } from "react-router-dom"
import {
  Brain,
  BookOpen,
  ArrowRight,
  CheckCircle,
  ShieldAlert,
  Zap,
  Target,
  FileSearch,
  FileText,
  Clock,
  BarChart3,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/context/AuthContext"

export default function Landing() {
  const { user } = useAuth()

  const ctaLink = user ? "/dashboard" : "/login"
  const ctaLabel = user ? "Acessar Plataforma" : "Começar Grátis"

  const features = [
    {
      title: "Setup Zero OAB",
      icon: Zap,
      color: "text-amber-400",
      border: "border-amber-500/20",
      line: "from-amber-500 to-yellow-400",
      description: "Digite a OAB e veja carteira, vitórias, derrotas, valores e oportunidades escondidas.",
      items: ["Histórico processual", "Taxa de sucesso", "Valor total", "Oportunidades"],
    },
    {
      title: "Verificar Processo",
      icon: FileSearch,
      color: "text-blue-400",
      border: "border-blue-500/20",
      line: "from-blue-500 to-cyan-400",
      description: "Entenda fase, risco, última movimentação e próximo evento provável do processo.",
      items: ["Fase processual", "Risco atual", "Alertas", "Próximos passos"],
    },
    {
      title: "IA Preditiva",
      icon: Brain,
      color: "text-indigo-400",
      border: "border-indigo-500/20",
      line: "from-indigo-500 to-violet-500",
      description: "Analise a força da tese, risco estratégico, heatmap e DNA decisório simulado.",
      items: ["Chance estratégica", "DNA do juiz", "Heatmap", "Recomendação"],
    },
    {
      title: "Jurisprudência",
      icon: BookOpen,
      color: "text-cyan-400",
      border: "border-cyan-500/20",
      line: "from-cyan-500 to-sky-400",
      description: "Descubra tendências, argumentos vencedores e riscos jurisprudenciais por tribunal.",
      items: ["Tendência", "Argumentos fortes", "Riscos", "Recomendações"],
    },
    {
      title: "Red Team Jurídico",
      icon: ShieldAlert,
      color: "text-red-400",
      border: "border-red-500/20",
      line: "from-red-500 to-orange-400",
      description: "Simule o ataque da parte contrária antes que ele aconteça no processo.",
      items: ["Contra-argumentos", "Pontos fracos", "Provas faltantes", "Blindagem"],
    },
    {
      title: "Relatórios Premium",
      icon: FileText,
      color: "text-purple-400",
      border: "border-purple-500/20",
      line: "from-purple-500 to-fuchsia-400",
      description: "Transforme análises em relatórios estratégicos para decisão, cliente ou escritório.",
      items: ["Resumo executivo", "Score", "Checklist", "Conclusão"],
    },
    {
      title: "Histórico Estratégico",
      icon: Clock,
      color: "text-emerald-400",
      border: "border-emerald-500/20",
      line: "from-emerald-500 to-green-400",
      description: "Salve análises e construa patrimônio jurídico dentro da plataforma.",
      items: ["Análises salvas", "Relatórios", "Casos", "Memória do escritório"],
    },
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#1e293b] bg-[#0a0a0f]/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#6366f1] to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">⚖</span>
            </div>
            <div>
              <span className="text-xl font-bold text-white">NexJud</span>
              <p className="text-xs text-gray-400">Inteligência Jurídica Estratégica</p>
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

      <section className="pt-36 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#6366f1]/10 via-transparent to-transparent" />

        <div className="relative max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#6366f1]/10 border border-[#6366f1]/20 mb-6">
            <Target className="w-4 h-4 text-[#22d3ee]" />
            <span className="text-sm text-gray-300">Estratégia processual antes da decisão</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-white leading-tight">
            Descubra a força real da sua tese
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#22d3ee]">
              antes de protocolar, recorrer ou fazer acordo.
            </span>
          </h1>

          <p className="text-xl text-gray-400 max-w-3xl mx-auto mb-10">
            O NexJud combina IA preditiva, jurisprudência estratégica, Red Team, verificação de processos,
            relatórios premium e histórico inteligente em uma única plataforma para advogados.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link to={ctaLink}>
              <Button size="lg" className="gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white">
                {ctaLabel}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>

            <a href="#funcionalidades">
              <Button size="lg" variant="outline" className="gap-2 border-[#334155] text-white hover:bg-[#111827]">
                Ver funcionalidades
              </Button>
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="rounded-2xl border border-[#1e293b] bg-[#121218] p-6">
              <div className="text-4xl font-bold text-[#6366f1] mb-1">7</div>
              <div className="text-sm text-gray-400">módulos estratégicos</div>
            </div>
            <div className="rounded-2xl border border-[#1e293b] bg-[#121218] p-6">
              <div className="text-4xl font-bold text-[#22d3ee] mb-1">1</div>
              <div className="text-sm text-gray-400">cockpit jurídico completo</div>
            </div>
            <div className="rounded-2xl border border-[#1e293b] bg-[#121218] p-6">
              <div className="text-4xl font-bold text-green-400 mb-1">Pro</div>
              <div className="text-sm text-gray-400">relatórios e histórico salvos</div>
            </div>
          </div>
        </div>
      </section>

      <section id="funcionalidades" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0f0f14]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white">
              Uma plataforma para decidir melhor
            </h2>
            <p className="text-gray-400 text-lg max-w-3xl mx-auto">
              Não é apenas um chat jurídico. É um processo estratégico para avaliar, atacar,
              fortalecer e documentar cada decisão importante.
            </p>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon

              return (
                <Card key={feature.title} className={`${feature.border} bg-[#121218] overflow-hidden`}>
                  <div className={`h-2 bg-gradient-to-r ${feature.line}`} />
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-white/5 rounded-lg flex items-center justify-center">
                        <Icon className={`w-7 h-7 ${feature.color}`} />
                      </div>
                      <CardTitle className="text-2xl text-white">{feature.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <p className="text-gray-400">{feature.description}</p>
                    <div className="grid grid-cols-2 gap-3">
                      {feature.items.map((item) => (
                        <div key={item} className="flex items-center gap-2 text-sm text-gray-300">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#22d3ee]/10 border border-[#22d3ee]/20 mb-6">
                <BarChart3 className="w-4 h-4 text-[#22d3ee]" />
                <span className="text-sm text-gray-300">Processo NexJud</span>
              </div>

              <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">
                Do caso bruto ao relatório estratégico.
              </h2>

              <p className="text-gray-400 text-lg mb-8">
                O NexJud organiza o raciocínio jurídico em uma sequência simples: entender o processo,
                medir risco, buscar base jurisprudencial, simular a parte contrária e gerar relatório final.
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
                "Informe OAB, processo ou tese",
                "A IA identifica riscos, fase e força estratégica",
                "A jurisprudência mostra tendências e argumentos úteis",
                "O Red Team simula o ataque da parte contrária",
                "O relatório final registra a decisão e salva no histórico",
              ].map((step, index) => (
                <div key={step} className="flex gap-4 rounded-2xl border border-[#1e293b] bg-[#121218] p-5">
                  <div className="w-10 h-10 rounded-full bg-[#6366f1]/10 flex items-center justify-center shrink-0">
                    <span className="font-bold text-[#6366f1]">{index + 1}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-1">Etapa {index + 1}</h3>
                    <p className="text-gray-400">{step}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0f0f14]">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-white">
            Comece grátis. Evolua para o plano Pro.
          </h2>
          <p className="text-gray-400 text-lg mb-8">
            Ideal para advogados que querem transformar análise jurídica em estratégia,
            decisão e histórico profissional.
          </p>

          <div className="rounded-3xl border border-[#6366f1]/20 bg-[#121218] p-8 mb-8">
            <div className="text-gray-400 mb-2">Plano Pro</div>
            <div className="text-5xl font-bold text-white mb-2">R$ 179,90</div>
            <div className="text-gray-500 mb-6">por mês</div>

            <div className="grid md:grid-cols-2 gap-3 text-left max-w-2xl mx-auto mb-8">
              {[
                "Análises estratégicas",
                "Red Team jurídico",
                "Relatórios premium",
                "Histórico salvo",
                "Jurisprudência estratégica",
                "Cockpit do advogado",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-gray-300">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <Link to={ctaLink}>
              <Button size="lg" className="gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white">
                {ctaLabel}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <p className="text-xs text-gray-500">
            O NexJud oferece apoio estratégico. A decisão jurídica final é sempre do advogado responsável.
          </p>
        </div>
      </section>

      <footer className="border-t border-[#1e293b] py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#6366f1] to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">⚖</span>
            </div>
            <span className="text-white font-bold">NexJud</span>
          </div>
          <p className="text-sm text-gray-400">© 2026 NexJud. Todos os direitos reservados.</p>
          <p className="text-xs text-gray-500">Desenvolvido para decisões jurídicas mais estratégicas.</p>
        </div>
      </footer>
    </div>
  )
}
