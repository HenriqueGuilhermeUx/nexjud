import { Brain, Sparkles } from "lucide-react"

export default function DashboardHero() {
  return (
    <section className="rounded-3xl border border-[#2a2a35] bg-gradient-to-br from-[#111118] via-[#0d0d15] to-[#05050a] p-8 lg:p-10 shadow-2xl">

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">

        <div className="max-w-3xl">

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-5">
            <Sparkles size={16}/>
            NexJud Strategic Intelligence™
          </div>

          <div className="flex items-center gap-3 mb-4">

            <Brain
              className="text-primary"
              size={40}
            />

            <h1 className="text-5xl font-bold leading-tight">
              Decida se vale entrar,
              negociar ou abandonar
              um processo.
            </h1>

          </div>

          <p className="text-lg text-muted-foreground">

            Plataforma Enterprise de Inteligência Jurídica com IA,
            Jurimetria, CNJ/DataJud, Estratégia,
            Due Diligence e Business Intelligence.

          </p>

        </div>

      </div>

    </section>
  )
}
