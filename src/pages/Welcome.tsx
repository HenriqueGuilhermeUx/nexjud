import { ArrowRight, Brain, Gavel, FileText, Shield, Sparkles } from "lucide-react"
import { useNavigate } from "react-router-dom"

export default function Welcome() {
  const navigate = useNavigate()

  function start() {
  navigate("/tutorial")
}

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="max-w-6xl w-full">

        <section className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 via-indigo-500/10 to-[#05050a] p-10">

          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="text-primary" size={36}/>
            <h1 className="text-5xl font-bold">
              Bem-vindo ao NexJud
            </h1>
          </div>

          <p className="text-xl text-muted-foreground max-w-3xl">
            Plataforma Enterprise de Inteligência Jurídica para
            decidir se vale entrar, negociar ou abandonar um processo.
          </p>

        </section>

        <section className="grid lg:grid-cols-2 gap-5 mt-8">

          <Card
            icon={<Brain/>}
            title="Strategic Analysis"
            text="Analisa automaticamente risco, chance de sucesso, estratégia, jurisprudência e retorno financeiro."
          />

          <Card
            icon={<Gavel/>}
            title="Judge Simulator"
            text="Simula a decisão de um juiz utilizando IA e critérios jurídicos."
          />

          <Card
            icon={<Shield/>}
            title="War Room"
            text="Cria uma sala estratégica completa com riscos, ataques e defesa."
          />

          <Card
            icon={<FileText/>}
            title="Gerador de Minutas"
            text="Produz petições, recursos, acordos e notificações em segundos."
          />

        </section>

        <div className="text-center mt-10">

          <button
            onClick={start}
            className="px-10 py-5 rounded-xl bg-primary text-white text-lg font-bold inline-flex items-center gap-3"
          >
            Começar agora
            <ArrowRight/>
          </button>

        </div>

      </div>
    </div>
  )
}

function Card({icon,title,text}:any){

return(

<div className="rounded-2xl border border-border bg-card p-6">

<div className="text-primary mb-3">
{icon}
</div>

<h2 className="font-bold text-xl">
{title}
</h2>

<p className="text-muted-foreground mt-3">
{text}
</p>

</div>

)

}
