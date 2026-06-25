import { Crown, Lock } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { usePlan } from "@/hooks/usePlan"

interface PremiumGateProps {
  children: React.ReactNode
  requiredPlan?: "pro" | "intelligence" | "enterprise"
  title?: string
}

export default function PremiumGate({
  children,
  requiredPlan = "pro",
  title = "Recurso Premium",
}: PremiumGateProps) {
  const navigate = useNavigate()

  const { plan } = usePlan()

  const levels = {
    trial: 0,
    pro: 1,
    intelligence: 2,
    enterprise: 3,
  }

  const current =
    levels[(plan || "trial") as keyof typeof levels] || 0

  const required =
    levels[requiredPlan]

  if (current >= required) {
    return <>{children}</>
  }

  return (
    <div className="rounded-3xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 to-black p-8 text-center">

      <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-6">

        <Lock
          className="text-yellow-400"
          size={30}
        />

      </div>

      <h2 className="text-3xl font-bold mb-3">
        {title}
      </h2>

      <p className="text-muted-foreground max-w-xl mx-auto">

        Este recurso faz parte do plano

        <strong>
          {" "}
          {requiredPlan.toUpperCase()}
        </strong>

      </p>

      <button
        onClick={() => navigate("/pricing")}
        className="mt-8 px-8 py-4 rounded-xl bg-primary text-white font-bold inline-flex items-center gap-2"
      >
        <Crown size={18} />
        Fazer Upgrade
      </button>

    </div>
  )
}
