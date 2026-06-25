import { Crown, ArrowRight } from "lucide-react"

export default function UpgradePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="max-w-xl w-full rounded-3xl border border-primary/30 bg-card p-8 text-center space-y-6">
        <Crown className="mx-auto text-primary" size={48} />

        <div>
          <h1 className="text-3xl font-bold">Recurso Premium</h1>
          <p className="text-muted-foreground mt-3">
            Este módulo faz parte de um plano superior do NexJud.
          </p>
        </div>

        <button
          onClick={() => (window.location.href = "/pricing")}
          className="w-full py-4 rounded-xl bg-primary text-white font-bold flex items-center justify-center gap-2"
        >
          Ver planos
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  )
}
