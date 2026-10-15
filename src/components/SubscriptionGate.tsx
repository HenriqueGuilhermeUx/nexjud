import { ReactNode } from "react"
import { Navigate } from "react-router-dom"
import { usePlan } from "@/hooks/usePlan"
import { paidEntitlementCurrent } from "@/services/paidEntitlement"

export default function SubscriptionGate({ children }: { children: ReactNode }) {
  const { subscription, loading, trialExpired } = usePlan()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366f1]" />
      </div>
    )
  }

  if (!subscription) return <Navigate to="/upgrade" replace />

  const paidActive = paidEntitlementCurrent(subscription)
  const trialActive = subscription.status === "trialing" && !trialExpired && subscription.active

  if (!paidActive && !trialActive) {
    return <Navigate to="/upgrade" replace />
  }

  return <>{children}</>
}
