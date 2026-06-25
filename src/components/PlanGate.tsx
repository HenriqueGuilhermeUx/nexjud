import { ReactNode } from "react"
import { Navigate } from "react-router-dom"
import { usePlan } from "@/hooks/usePlan"
import { PlanType } from "@/services/subscriptionService"

export default function PlanGate({
  requiredPlan,
  children,
}: {
  requiredPlan: PlanType
  children: ReactNode
}) {
  const { loading, hasPlan } = usePlan()

  if (loading) {
    return <div className="p-6">Verificando plano...</div>
  }

  if (!hasPlan(requiredPlan)) {
    return <Navigate to="/upgrade" replace />
  }

  return <>{children}</>
}
