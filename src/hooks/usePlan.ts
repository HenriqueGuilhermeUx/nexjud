import { useEffect, useMemo, useRef, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { paidEntitlementCurrent } from "@/services/paidEntitlement"
import {
  getOrCreateSubscription,
  getTrialDaysLeft,
  isTrialExpired,
  Subscription,
  PlanType,
} from "@/services/subscriptionService"

const PLAN_LEVEL: Record<PlanType, number> = {
  trial: 0,
  pro: 1,
  intelligence: 2,
  enterprise: 3,
  enterprise_plus: 4,
}

export function usePlan() {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  // An old request must never publish a previous account's subscription after sign-out/account switch.
  const requestVersion = useRef(0)

  useEffect(() => {
    const version = ++requestVersion.current
    setSubscription(null)
    if (!user?.id) {
      setLoading(false)
      return () => { requestVersion.current++ }
    }
    setLoading(true)
    getOrCreateSubscription(user.id).then((data) => {
      if (requestVersion.current === version && data.user_id === user.id) setSubscription(data)
    }).catch((error) => {
      if (requestVersion.current === version) {
        setSubscription(null)
        console.error("Erro ao carregar assinatura:", error)
      }
    }).finally(() => {
      if (requestVersion.current === version) setLoading(false)
    })
    return () => { requestVersion.current++ }
  }, [user?.id])

  async function load() {
    const userId = user?.id
    const version = ++requestVersion.current
    if (!userId) {
      setSubscription(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = await getOrCreateSubscription(userId)
      if (requestVersion.current === version && data.user_id === userId) setSubscription(data)
    } catch (error) {
      if (requestVersion.current === version) {
        setSubscription(null)
        console.error("Erro ao carregar assinatura:", error)
      }
    } finally {
      if (requestVersion.current === version) setLoading(false)
    }
  }

  const plan = subscription?.plan || "trial"
  const level = PLAN_LEVEL[plan]
  const trialExpired = isTrialExpired(subscription)
  const trialDaysLeft = getTrialDaysLeft(subscription)

  function hasPlan(required: PlanType) {
    if (!subscription) return false
    if (subscription.status === "trialing" && !trialExpired && subscription.active) return true
    if (!paidEntitlementCurrent(subscription)) return false
    return level >= PLAN_LEVEL[required]
  }

  const permissions = useMemo(
    () => ({
      canUsePro: hasPlan("pro"),
      canUseIntelligence: hasPlan("intelligence"),
      canUseEnterprise: hasPlan("enterprise"),
      canUseEnterprisePlus: hasPlan("enterprise_plus"),

      canUseStrategic: hasPlan("pro"),
      canUseJudge: hasPlan("pro"),
      canUseDraft: hasPlan("pro"),
      canUsePortfolio: hasPlan("pro"),

      canUseLegalIntelligence: hasPlan("intelligence"),
      canUseWarRoom: hasPlan("intelligence"),
      canUsePartnerCouncil: hasPlan("intelligence"),
      canUseOpponent: hasPlan("intelligence"),
      canUseHeatmap: hasPlan("intelligence"),
      canUseBoardReport: hasPlan("intelligence"),

      canUseLitigationStrategy: hasPlan("enterprise"),
      canUseAnalytics: hasPlan("enterprise"),
      canUseAgenda: hasPlan("enterprise"),
      canUseAlerts: hasPlan("enterprise"),
    }),
    [subscription]
  )

  return {
    subscription,
    plan,
    loading,
    trialExpired,
    trialDaysLeft,
    refresh: load,
    hasPlan,
    ...permissions,
  }
}
