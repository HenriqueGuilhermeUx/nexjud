import { ArrowRight, Check, Crown, Lock, Sparkles } from "lucide-react"

export default function UpgradePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="max-w-5xl w-full grid lg:grid-cols-2 gap-6">
        <section className="rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/20 via-indigo-500/10 to-[#05050a] p-8 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mb-6">
            <Lock className="text-primary" size={30} />
          </div>

          <h1 className="text-4xl font-bold">Desbloqueie o NexJud Enterprise</h1>

          <p className="text-muted-foreground mt-4 text-lg">
            Este módulo faz parte de um plano superior. Escolha um plano para liberar
            inteligência jurídica avançada, relatórios executivos e estratégia completa.
          </p>

          <button
            onClick={() => (window.location.href = "/pricing")}
            className="mt-8 w-full py-4 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2"
          >
            Ver planos
            <ArrowRight size={18} />
          </button>
        </section>

        <section className="rounded-3xl border border-border bg-card p-8">
          <div className="flex items-center gap-2 mb-6">
            <Crown className="text-yellow-400" />
            <h2 className="text-2xl font-bold">Recursos Premium</h2>
          </div>

          <div className="space-y-4">
            {[
              "Legal Intelligence Engine",
              "Litigation Strategy AI",
              "War Room",
              "Partner Council",
              "Board Report",
              "Opponent Intelligence",
              "Tribunal Heatmap",
              "Enterprise Analytics",
              "Agenda Jurídica IA",
              "Alertas Inteligentes",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-xl bg-black/20 border border-white/5 p-4"
              >
                <Check className="text-green-400" size={18} />
                <span className="font-medium">{item}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="text-primary" size={18} />
              <p className="font-bold">Recomendado</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Para começar a vender, recomendo destacar o plano Intelligence como principal
              e deixar Enterprise para escritórios.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
