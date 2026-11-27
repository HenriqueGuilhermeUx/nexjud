import FreeProcessLookup from "@/components/FreeProcessLookup"
import { Link } from "react-router-dom"
import {
  ArrowRight,
  Bell,
  CheckCircle,
  Crown,
  FileText,
  Gavel,
  Link2,
  Mail,
  Smartphone,
  Sparkles,
  Target,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/AuthContext"
import { NEXJUD_PROMISE } from "@/navigation/toolCatalog"

// Home do site. Mensagem central: a IA genérica não conhece o seu processo nem o seu juiz;
// o NexJud conhece — e mostra a fonte de tudo que usa.
// Os textos de marketing ficam alinhados com docs/marketing/kit-lancamento.md.

export default function Landing() {
  const { user } = useAuth()
  const ctaLink = user ? "/dashboard" : "/login"
  const ctaLabel = user ? "Abrir meus processos" : "Começar 7 dias grátis"

  const steps = [
    {
      icon: Bell,
      title: "Seus processos, explicados todo dia",
      text: "Digite sua OAB e trazemos seus processos. Todo dia lemos o DJEN (CNJ) e os tribunais e mandamos por e-mail o que mudou, em português simples, com o próximo passo e o prazo para você conferir.",
    },
    {
      icon: Target,
      title: "Como o seu juiz tem decidido",
      text: "Para cada processo, o dossiê do juízo: quantas sentenças a vara publicou nos últimos meses, quantas procedentes, parciais e improcedentes, e os fundamentos que se repetem. Cada número com o link da decisão.",
    },
    {
      icon: Sparkles,
      title: "Três teses sugeridas para o seu lado",
      text: "Diga se representa o autor ou o réu. Sugerimos a tese principal, a subsidiária e o que a outra parte deve alegar, cada uma apoiada em decisões reais da mesma vara.",
    },
    {
      icon: FileText,
      title: "A peça pronta para revisar",
      text: "Escolha a tese e gere a petição com os fatos do processo e as decisões da própria vara, citadas com data, número e link. Sem jurisprudência inventada.",
    },
  ]

  const comparison: [string, boolean, boolean][] = [
    ["Sabe o que aconteceu no seu processo ontem", false, true],
    ["Conhece as decisões recentes da sua vara", false, true],
    ["Sugere a tese para o seu lado, com base no juízo", false, true],
    ["Cita decisões com link para conferir", false, true],
    ["Avisa por e-mail quando algo muda", false, true],
    ["Escreve textos jurídicos", true, true],
  ]

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#1e293b] bg-[#0a0a0f]/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center">
            <span className="inline-flex items-center gap-2 text-2xl md:text-3xl font-extrabold tracking-tight" aria-label="NexJud"><Gavel aria-hidden="true" className="h-7 w-7 md:h-8 md:w-8 text-[#818cf8]" /><span>Nex<span className="text-[#818cf8]">Jud</span></span></span>
          </Link>
          <div className="flex items-center gap-2">
            <a href="#consulta-gratis" className="hidden md:block"><Button variant="outline" className="border-[#334155] text-white hover:bg-[#111827]">Consulta grátis</Button></a>
            <Link to="/pricing" className="hidden md:block"><Button variant="outline" className="border-[#334155] text-white hover:bg-[#111827]">Planos</Button></Link>
            <Link to={ctaLink}>
              <Button className="gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white">{ctaLabel}<ArrowRight className="w-4 h-4" /></Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="pt-36 pb-16 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#6366f1]/20 via-transparent to-transparent" />
        <div className="relative max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#6366f1]/10 border border-[#6366f1]/20 mb-6">
            <Sparkles className="w-4 h-4 text-[#22d3ee]" />
            <span className="text-sm text-gray-300">7 dias de Trial Premium · sem cartão</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            A IA jurídica que conhece
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[#6366f1] to-[#22d3ee]">o seu processo e o seu juiz.</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-4">{NEXJUD_PROMISE.subline}</p>
          <p className="text-sm text-gray-500 max-w-3xl mx-auto mb-10">Feito para advogados e escritórios pequenos e médios que hoje usam uma IA genérica e copiam e colam o processo inteiro para ter uma resposta.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to={ctaLink}><Button size="lg" className="gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white">{ctaLabel}<ArrowRight className="w-4 h-4" /></Button></Link>
            <a href="#consulta-gratis"><Button size="lg" variant="outline" className="gap-2 border-[#334155] text-white hover:bg-[#111827]">Ver o dossiê do juízo de um processo, grátis</Button></a>
          </div>
        </div>
      </section>

      <section id="consulta-gratis" className="py-16 px-4 bg-[#0b0b10] border-y border-[#1f2937]">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Teste agora com um processo seu</h2>
          <p className="text-gray-400 mb-8">Cole o número CNJ. Mostramos a vara, a classe e quantas decisões esse juízo publicou nos últimos meses — e como decidiu. Sem cadastro.</p>
          <FreeProcessLookup ctaTo={user ? "/dashboard/decision-intelligence" : "/login"} />
        </div>
      </section>

      <section id="como-funciona" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14 max-w-3xl mx-auto">
            <p className="text-sm font-bold tracking-widest text-[#22d3ee] mb-3">COMO FUNCIONA</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Do aviso à peça, sem copiar e colar nada.</h2>
            <p className="text-gray-400 text-lg">Fontes oficiais: DJEN (CNJ), tribunais e Escavador. Você confere tudo antes de usar.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            {steps.map(({ icon: Icon, title, text }, i) => (
              <div key={title} className="rounded-3xl border border-[#1e293b] bg-[#121218] p-7">
                <div className="flex items-center gap-3"><span className="w-9 h-9 rounded-full bg-[#6366f1]/15 flex items-center justify-center font-bold text-[#a5b4fc]">{i + 1}</span><Icon className="text-[#6366f1]" size={24} /></div>
                <h3 className="text-xl font-bold mt-4">{title}</h3>
                <p className="text-gray-400 mt-2 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-[#0f0f14]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-3">IA genérica × NexJud</h2>
          <p className="text-gray-400 text-center mb-10">A IA genérica responde sobre Direito. O NexJud responde sobre o seu caso.</p>
          <div className="rounded-3xl border border-[#1e293b] overflow-hidden">
            <div className="grid grid-cols-[1fr_120px_120px] bg-[#121218] px-5 py-3 text-sm font-semibold text-gray-300"><span></span><span className="text-center">IA genérica</span><span className="text-center text-[#a5b4fc]">NexJud</span></div>
            {comparison.map(([label, generic, nexjud]) => (
              <div key={label} className="grid grid-cols-[1fr_120px_120px] px-5 py-3 border-t border-[#1e293b] text-sm">
                <span className="text-gray-200">{label}</span>
                <span className="flex justify-center">{generic ? <CheckCircle className="w-5 h-5 text-gray-400" /> : <X className="w-5 h-5 text-gray-600" />}</span>
                <span className="flex justify-center">{nexjud ? <CheckCircle className="w-5 h-5 text-green-400" /> : <X className="w-5 h-5 text-gray-600" />}</span>
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-3 gap-4 mt-8 text-sm">
            <p className="flex gap-2 text-gray-300"><Link2 className="w-5 h-5 text-[#22d3ee] shrink-0" />Cada decisão citada tem link para o tribunal.</p>
            <p className="flex gap-2 text-gray-300"><Mail className="w-5 h-5 text-[#22d3ee] shrink-0" />Resumo diário por e-mail, só quando algo muda.</p>
            <p className="flex gap-2 text-gray-300"><Gavel className="w-5 h-5 text-[#22d3ee] shrink-0" />Sem percentual de êxito inventado: mostramos o que as decisões dizem.</p>
          </div>
        </div>
      </section>

      <section id="solucoes" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl mb-10">
            <p className="text-sm font-bold tracking-widest text-[#22d3ee] mb-4">PARA QUEM É</p>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Estrutura de escritório grande, no tamanho do seu.</h2>
          </div>
          <div className="grid lg:grid-cols-3 gap-5">
            {[
              { name: "Profissional e escritório pequeno", headline: "Pare de copiar e colar processo na IA", description: "Seus processos acompanhados todo dia, a estratégia de cada caso com base no seu juiz e a peça pronta para revisar.", links: ["Importação pela OAB", "Resumo diário por e-mail", "DNA do Juiz com teses sugeridas"] },
              { name: "Escritório em crescimento", headline: "Ninguém perde um prazo, todo mundo usa a mesma estratégia", description: "Uma visão única do que mudou em todos os processos, com o próximo passo de cada um e a memória do escritório.", links: ["Visão de todos os processos", "Peças com decisões da própria vara", "Web, PWA e app"] },
              { name: "Departamento jurídico e Enterprise", headline: "Estrutura para escalar com controle", description: "Trilha de implantação para equipes, auditoria e contencioso de volume. Recursos corporativos sujeitos a escopo e homologação.", links: ["Diagnóstico da operação", "Fluxos e permissões a validar", "Implantação assistida sob consulta"] },
            ].map((segment) => (
              <article key={segment.name} className="rounded-3xl border border-[#283347] bg-[#121821] p-7 flex flex-col">
                <p className="text-xs font-bold uppercase tracking-wide text-[#22d3ee]">{segment.name}</p>
                <h3 className="text-2xl font-bold mt-3">{segment.headline}</h3>
                <p className="text-gray-400 leading-relaxed mt-3">{segment.description}</p>
                <ul className="mt-6 space-y-3 flex-1">{segment.links.map((item) => <li key={item} className="text-sm text-gray-300 flex gap-2"><CheckCircle size={17} className="text-[#818cf8] shrink-0 mt-0.5" />{item}</li>)}</ul>
                <Link to="/pricing" className="mt-7 text-sm font-semibold text-[#a5b4fc] hover:underline inline-flex items-center gap-2">Ver opções de acesso <ArrowRight size={16} /></Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-[#0f0f14]">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#6366f1]/10 border border-[#6366f1]/20 mb-6"><Smartphone size={16} className="text-[#22d3ee]" /> Web, PWA e app</div>
            <h2 className="text-4xl md:text-5xl font-bold">No computador e no celular, a mesma conta.</h2>
            <p className="text-gray-400 text-lg mt-5 leading-relaxed">Veja as novidades dos seus processos e a estratégia do caso no celular, antes da audiência ou no fórum.</p>
            <Link to="/companion"><Button size="lg" className="mt-8 gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white">Conhecer o app<ArrowRight size={18} /></Button></Link>
          </div>
          <div className="mx-auto w-full max-w-sm rounded-[42px] border-8 border-[#252535] bg-[#121218] p-6 shadow-2xl">
            <div className="w-24 h-5 rounded-full bg-[#272738] mx-auto mb-6" />
            <p className="text-xs font-bold tracking-widest text-[#818cf8]">MEUS PROCESSOS</p>
            <div className="mt-4 rounded-2xl border border-amber-500/40 bg-[#171721] p-4">
              <p className="text-[11px] font-bold text-amber-300">ATENÇÃO</p>
              <p className="font-bold mt-1">Sentença publicada</p>
              <p className="text-sm text-gray-300 mt-1">Pedido parcialmente procedente. Próximo passo: avaliar apelação. Prazo provável: 15 dias úteis — confirme no tribunal.</p>
            </div>
            <div className="mt-3 rounded-2xl border border-[#2b2b3d] bg-[#171721] p-4">
              <p className="text-[11px] font-bold text-[#a5b4fc]">ESTRATÉGIA DO CASO</p>
              <p className="text-sm text-gray-300 mt-1">99 sentenças desta vara em 4 meses · 3 teses sugeridas</p>
            </div>
          </div>
        </div>
      </section>

      <section id="planos" className="py-20 px-4">
        <div className="max-w-5xl mx-auto text-center mb-12"><h2 className="text-4xl md:text-5xl font-bold mb-4">Comece com 7 dias grátis</h2><p className="text-gray-400 text-lg">Sem cartão. Depois, escolha o plano. O DNA do Juiz — IA Preditiva de padrões decisórios, sem promessa de resultado — está em todos os planos pagos.</p></div>
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
          <Plan name="Trial Premium" price="7 dias grátis" badge="SEM CARTÃO" items={["Importação pela OAB", "Acompanhamento diário pelo DJEN", "Dossiê do juízo e teses sugeridas", "Resumo por e-mail"]} />
          <Plan name="Pro e Intelligence" price="A partir de R$ 197/mês" featured items={["Pro: R$ 197 por mês", "Intelligence: R$ 397 por mês", "Monitoramento também nos tribunais", "Pagamento Pix mensal, sem renovação automática"]} />
          <Plan name="Enterprise e Plus" price="R$ 797 ou R$ 1.497/mês" items={["Recursos adicionais conforme o plano", "Enterprise Plus: operações e integrações sujeitas à validação", "Implantação e condições especiais sob consulta", "Consulte os detalhes antes de contratar"]} />
        </div>
      </section>

      <section className="py-20 px-4 bg-[#0f0f14]">
        <div className="max-w-5xl mx-auto rounded-3xl border border-[#6366f1]/30 bg-gradient-to-r from-[#6366f1]/20 to-[#22d3ee]/10 p-10 text-center">
          <h2 className="text-4xl font-bold mb-4">Digite sua OAB. Em um minuto você vê seus processos e como o seu juiz decide.</h2>
          <p className="text-gray-300 text-lg mb-8">7 dias grátis, sem cartão.</p>
          <Link to={ctaLink}><Button size="lg" className="gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white">{ctaLabel}<ArrowRight className="w-4 h-4" /></Button></Link>
        </div>
      </section>

      <footer className="border-t border-[#1e293b] py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <img src="/nexjud-logo.svg" alt="NexJud" className="h-14 w-auto object-contain" />
          <p className="text-sm text-gray-400">© 2026 NexJud. Fontes: DJEN/CNJ, tribunais e Escavador. O NexJud não prevê nem garante resultados.</p>
          <Link to="/companion" className="text-xs text-[#818cf8] hover:underline">NexJud Companion</Link>
        </div>
      </footer>
    </div>
  )
}

function Plan({ name, price, items, featured, badge }: any) {
  return (
    <div className={`rounded-3xl border p-8 bg-[#121218] ${featured ? "border-[#6366f1] scale-[1.02] shadow-2xl" : "border-[#1e293b]"}`}>
      {(badge || featured) && <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#6366f1]/10 text-[#a5b4fc] text-xs font-bold mb-4"><Crown size={14} />{badge || "MAIS RECOMENDADO"}</div>}
      <h3 className="text-2xl font-bold">{name}</h3><p className="text-3xl font-bold mt-4">{price}</p>
      <Link to="/pricing"><Button className="w-full mt-6 bg-[#6366f1] hover:bg-[#5558e3] text-white">Escolher</Button></Link>
      <ul className="space-y-3 mt-6">{items.map((item: string) => <li key={item} className="flex gap-2 text-gray-300"><CheckCircle className="w-4 h-4 text-green-400 shrink-0 mt-1" />{item}</li>)}</ul>
    </div>
  )
}
