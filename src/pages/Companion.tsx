import { Link } from "react-router-dom"
import { ArrowLeft, Brain, Briefcase, Camera, CheckCircle, Download, Smartphone, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"

const features = [
  [Camera, "Scanner jurídico", "Fotografe contratos, despachos, sentenças e intimações e envie diretamente ao Workspace."],
  [Brain, "Legal Brain no celular", "Use o mesmo contexto, memória, jurisprudência, precedentes e CNJ da plataforma web."],
  [Briefcase, "Casos sincronizados", "Acesse no celular os mesmos casos cadastrados no NexJud Workspace."],
  [Upload, "Um ecossistema", "Tudo que for enviado pelo Companion aparece também na Knowledge Base do Workspace."],
]

export default function Companion() {
  return (
    <div className="min-h-screen bg-[#09090f] text-white">
      <nav className="border-b border-[#1e293b] bg-[#09090f]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-gray-300 hover:text-white">
            <ArrowLeft size={18} /> Voltar ao NexJud
          </Link>
          <div className="font-bold">⚖ NexJud Companion</div>
        </div>
      </nav>

      <main>
        <section className="px-4 py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[#6366f1]/25 via-transparent to-transparent" />
          <div className="relative max-w-6xl mx-auto grid lg:grid-cols-2 gap-14 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#6366f1]/30 bg-[#6366f1]/10 px-4 py-2 text-sm text-gray-300 mb-6">
                <Smartphone size={16} className="text-[#22d3ee]" /> App oficial do ecossistema NexJud
              </div>
              <h1 className="text-5xl md:text-7xl font-black leading-tight">O advogado no seu bolso.</h1>
              <p className="text-xl text-gray-400 mt-6 leading-relaxed">
                Scanner, IA jurídica, casos e documentos conectados ao mesmo Legal Brain do NexJud Workspace.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 mt-8">
                <Button size="lg" className="gap-2 bg-[#6366f1] hover:bg-[#5558e3] text-white" disabled>
                  <Download size={18} /> Android em preparação
                </Button>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="border-[#334155] text-white hover:bg-[#111827]">
                    Acessar Workspace
                  </Button>
                </Link>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                O código do aplicativo já está integrado ao Supabase e ao Legal Brain. A liberação na Google Play depende apenas do build assinado e da aprovação da loja.
              </p>
            </div>

            <div className="mx-auto w-full max-w-sm rounded-[42px] border-8 border-[#1d1d29] bg-[#11111a] p-6 shadow-2xl">
              <div className="w-24 h-5 rounded-full bg-[#252535] mx-auto mb-8" />
              <p className="text-xs font-bold tracking-widest text-[#818cf8]">NEXJUD COMPANION</p>
              <h2 className="text-3xl font-bold mt-2">O que você precisa agora?</h2>
              <div className="grid grid-cols-2 gap-3 mt-6">
                {["Escanear", "Perguntar à IA", "Meus casos", "Audiência"].map((item) => (
                  <div key={item} className="min-h-28 rounded-2xl border border-[#2b2b3d] bg-[#171721] p-4 flex flex-col justify-end">
                    <span className="font-bold">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-4 py-20 bg-[#0f0f15]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-4xl md:text-5xl font-bold">Workspace e Companion trabalham juntos.</h2>
              <p className="text-gray-400 text-lg mt-4">Mesmo login, mesmos casos, mesmos documentos e o mesmo cérebro jurídico.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {features.map(([Icon, title, description]: any) => (
                <div key={title} className="rounded-3xl border border-[#242437] bg-[#14141d] p-6">
                  <Icon className="text-[#818cf8]" size={32} />
                  <h3 className="text-xl font-bold mt-5">{title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed mt-2">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-20">
          <div className="max-w-5xl mx-auto rounded-3xl border border-[#6366f1]/30 bg-gradient-to-r from-[#6366f1]/20 to-[#22d3ee]/10 p-10">
            <h2 className="text-4xl font-bold">Comunicação já preparada</h2>
            <div className="grid md:grid-cols-2 gap-4 mt-8">
              {["Supabase Auth compartilhado", "Legal Brain legal-chat-ai", "Casos sincronizados", "Storage knowledge-files", "Trial e assinatura compartilhados", "Documentos enviados ao Workspace"].map((item) => (
                <div key={item} className="flex gap-3 items-center text-gray-200"><CheckCircle className="text-green-400" size={18} />{item}</div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
