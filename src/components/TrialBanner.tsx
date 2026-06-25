import { Crown, Clock } from "lucide-react"
import { usePlan } from "@/hooks/usePlan"

export default function TrialBanner() {
  const {
    plan,
    trialDaysLeft,
    subscription,
  } = usePlan()

  if (!subscription) return null

  if (plan !== "trial") return null

  return (
    <div className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-indigo-500/10 to-[#05050a] p-6 mb-8">

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

        <div>

          <div className="flex items-center gap-2 mb-3">
            <Crown className="text-primary"/>
            <span className="font-bold text-lg">
              Trial Premium
            </span>
          </div>

          <p className="text-muted-foreground">
            Você está utilizando TODOS os recursos do NexJud.
          </p>

          <div className="flex items-center gap-2 mt-4 text-yellow-400">

            <Clock size={18}/>

            Restam

            <strong>
              {trialDaysLeft} dias
            </strong>

            para escolher seu plano.

          </div>

        </div>

        <div className="flex gap-3">

          <button
            onClick={()=>window.location.href="/pricing"}
            className="px-6 py-3 rounded-xl bg-primary text-white font-bold"
          >
            Ver Planos
          </button>

        </div>

      </div>

    </div>
  )
}
