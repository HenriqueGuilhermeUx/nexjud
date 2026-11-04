import { ReactNode } from "react"
import { Navigate } from "react-router-dom"
import { usePlan } from "@/hooks/usePlan"
import { paidEntitlementCurrent } from "@/services/paidEntitlement"

export default function SubscriptionGate({ children }: { children: ReactNode }) {
  const { subscription, loading, trialExpired, subscriptionError, refresh } = usePlan()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#6366f1]" />
      </div>
    )
  }

  if (subscriptionError) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] text-white flex items-center justify-center p-6">
        <div role="alert" className="max-w-md w-full text-center rounded-2xl border border-amber-500/30 bg-[#14141e] p-8">
          <h1 className="text-xl font-bold">Não foi possível verificar sua assinatura</h1>
          <p className="text-sm text-gray-300 mt-3">
            O acesso não foi liberado porque a consulta falhou. Isso não significa que seu plano expirou.
            Tente novamente antes de realizar outra contratação.
          </p>
          <button type="button" onClick={() => { void refresh() }} className="mt-6 rounded-xl bg-primary px-6 py-3 font-semibold text-white">
            Tentar novamente
          </button>
        </div>
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
