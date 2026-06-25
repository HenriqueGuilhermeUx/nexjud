import { Sparkles, Clock, Crown } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { usePlan } from "@/hooks/usePlan"

export default function DashboardTrialHeader() {
  const navigate = useNavigate()
  const { plan, trialDaysLeft } = usePlan()

  return (
    <>
      <section className="rounded-3xl border border-primary/30 bg-gradient-to-r from-primary/10 via-indigo-500/10 to-[#05050a] p-8 shadow-xl">
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="text-primary" />
              <span className="font-bold text-xl">NexJud Enterprise</span>
            </div>

            <h2 className="text-3xl font-bold mb-2">
              {plan === "trial" ? "Trial Premium Ativo" : "Plano Ativo"}
            </h2>

            <p className="text-muted-foreground">
              Você está utilizando os recursos do NexJud conforme seu plano atual.
            </p>

            {plan === "trial" && (
              <div className="flex items-center gap-2 mt-4 text-yellow-400">
                <Clock size={18} />
                Restam <strong>{trialDaysLeft}</strong> dias de avaliação.
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate("/pricing")}
              className="px-6 py-4 rounded-xl bg-primary text-white font-bold"
            >
              Ver Planos
            </button>

            <button
              onClick={() => navigate("/upgrade")}
              className="px-6 py-4 rounded-xl border border-primary flex items-center gap-2"
            >
              <Crown size={18} />
              Upgrade
            </button>
          </div>
        </div>
      </section>

      <section className="grid md:grid-cols-4 gap-4">
        <MiniMetric title="Plano" value={plan?.toUpperCase() || "TRIAL"} color="text-primary" />
        <MiniMetric title="Dias restantes" value={plan === "trial" ? String(trialDaysLeft) : "∞"} color="text-yellow-400" />
        <MiniMetric title="Módulos IA" value="16" color="text-green-400" />
        <MiniMetric title="Enterprise" value={plan === "trial" ? "Trial" : "Ativo"} color="text-indigo-400" />
      </section>
    </>
  )
}

function MiniMetric({
  title,
  value,
  color = "",
}: {
  title: string
  value: string
  color?: string
}) {
  return (
    <div className="bg-[#111118] rounded-2xl p-5 border border-[#2a2a35]">
      <p className="text-sm text-gray-400">{title}</p>
      <h2 className={`text-3xl font-bold ${color}`}>{value}</h2>
    </div>
  )
}
