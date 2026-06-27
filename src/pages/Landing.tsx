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
  Wand2,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"

export default function Landing() {
  const { user } = useAuth()

  const ctaLink = user ? "/dashboard" : "/login"
  const ctaLabel = user ? "Acessar plataforma" : "Começar trial grátis"

  const resources = [
    ["Analisar documentos", "PDFs, DOCX, contratos, estatutos, atas e imagens com OCR.", FileText],
    ["Conversar com a IA", "Pergunte usando seus documentos, casos e memória jurídica.", Brain],
    ["Analisar processos", "Riscos, chances de êxito, estratégia e próximos passos.", Target],
    ["Criar petições", "Gere peças, contratos, notificações e minutas com IA.", Wand2],
    ["Simular decisões", "Antecipe como um juiz poderia enxergar o caso.", Gavel],
    ["War Room", "Cenários, riscos, ataques prováveis e plano de ação.", ShieldAlert],
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
              <p className="text-xs text-gray-400">AI Legal Workspace</p>
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
            <span className="text-sm text-gray-300">7 dias de Trial Premium · sem cartão</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            A IA jurídica que trabalha
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#22d3ee]">
              como um sócio do escritório.
            </span>
          </h1>

          <p className="text-xl text-gray-400 max-w-4xl mx-auto mb-10">
            O NexJud analisa documentos, organiza casos, encontra riscos,
            monta estratégias, simula decisões e ajuda a criar peças jurídicas
            em um único workspace.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link to={ctaLink}>
              <Button size="lg" className="gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white">
                {ctaLabel}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>

            <a href="#como-funciona">
              <Button size="lg" variant="outline" className="gap-2 border-[#334155] text-white hover:bg-[#111827]">
                Ver como funciona
              </Button>
            </a>
          </div>

          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <Metric value="PDF" label="DOCX e OCR" />
            <Metric value="IA" label="com memória jurídica" />
            <Metric value="7 dias" label="trial premium" />
            <Metric value="1 lugar" label="documentos, casos e estratégia" />
          </div>
        </div>
      </section>

      <section id="como-funciona" className="py-20 px-4 bg-[#0f0f14]">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#22d3ee]/10 border border-[#22d3ee]/20 mb-6">
              <Brain className="w-4 h-4 text-[#22d3ee]" />
              <span className="text-sm text-gray-300">Como funciona</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Do documento à estratégia em poucos minutos.
            </h2>

            <p className="text-gray-400 text-lg mb-8">
              Envie um contrato, estatuto, ata, petição ou PDF. O NexJud lê,
              organiza o contexto, cruza com memória e entrega uma resposta
              objetiva, fundamentada e estratégica.
            </p>

            <Link to={ctaLink}>
              <Button size="lg" className="gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white">
                Começar agora
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="space-y-4">
            {[
              "Envie documento, processo ou pergunta jurídica",
              "A IA identifica se é análise documental, estratégia ou produção",
              "O sistema usa Knowledge Base, memória, casos e histórico",
              "Você recebe resposta objetiva, riscos e próximos passos",
              "Depois pode gerar peça, relatório ou estratégia completa",
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
              Tudo que o advogado faz. Em um único lugar.
            </h2>
            <p className="text-gray-400 text-lg">
              Menos abas abertas. Mais clareza, estratégia e produtividade.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {resources.map(([title, desc, Icon]: any) => (
              <div key={title} className="rounded-3xl border border-[#1e293b] bg-[#121218] p-6">
                <Icon className="text-[#6366f1] mb-4" size={32} />
                <h3 className="text-xl font-bold">{title}</h3>
                <p className="text-gray-400 mt-2 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-[#0f0f14]">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-8">
          <div className="rounded-3xl border border-[#1e293b] bg-[#121218] p-8">
            <h2 className="text-3xl font-bold mb-6">ChatGPT genérico</h2>
            {[
              "Não conhece seus casos",
              "Não guarda memória do escritório",
              "Não organiza documentos",
              "Não monta fluxo jurídico completo",
              "Não separa documento, jurisprudência e estratégia",
            ].map((item) => (
              <p key={item} className="text-gray-400 mb-3">✕ {item}</p>
            ))}
          </div>

          <div className="rounded-3xl border border-[#6366f1] bg-[#121218] p-8 shadow-2xl">
            <h2 className="text-3xl font-bold mb-6">NexJud</h2>
            {[
              "Lê documentos e PDFs",
              "Possui Knowledge Base e memória jurídica",
              "Organiza casos e histórico",
              "Cria estratégia, peças e relatórios",
              "Trabalha com Document Review, Chat e Strategy Engine",
            ].map((item) => (
              <p key={item} className="text-gray-200 mb-3 flex gap-2">
                <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                {item}
              </p>
            ))}
          </div>
        </div>
      </section>

      <section id="planos" className="py-20 px-4">
        <div className="max-w-5xl mx-auto text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Comece com Trial Premium</h2>
          <p className="text-gray-400 text-lg">
            Teste todos os recursos por 7 dias. Depois escolha o plano ideal.
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
          <Plan name="Trial Premium" price="7 dias grátis" badge="SEM CARTÃO" items={["Acesso completo", "Documentos e OCR", "Chat Jurídico", "Strategy Engine"]} />
          <Plan name="Premium" price="R$ 179,90/mês" featured items={["Para advogados e escritórios", "IA com documentos", "Memória jurídica", "Geração de peças"]} />
          <Plan name="Enterprise" price="Sob consulta" items={["Equipes", "War Room", "Dashboards executivos", "Customizações"]} />
        </div>
      </section>

      <section className="py-20 px-4 bg-[#0f0f14]">
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

function Plan({ name, price, items, featured, badge }: any) {
  return (
    <div className={`rounded-3xl border p-8 bg-[#121218] ${featured ? "border-[#6366f1] scale-[1.02] shadow-2xl" : "border-[#1e293b]"}`}>
      {badge && (
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6366f1]/10 text-[#a5b4fc] text-xs font-bold mb-4">
          <Crown size={14} />
          {badge}
        </div>
      )}

      {featured && !badge && (
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6366f1]/10 text-[#a5b4fc] text-xs font-bold mb-4">
          <Crown size={14} />
          MAIS RECOMENDADO
        </div>
      )}

      <h3 className="text-2xl font-bold">{name}</h3>
      <p className="text-3xl font-bold mt-4">{price}</p>

      <Link to="/pricing">
        <Button className="w-full mt-6 bg-[#6366f1] hover:bg-[#5558e3] text-white">
          Escolher
        </Button>
      </Link>

      <ul className="space-y-3 mt-6">
        {items.map((item: string) => (
          <li key={item} className="flex gap-2 text-gray-300">
            <CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-1" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
