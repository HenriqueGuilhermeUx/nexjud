import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/context/AuthContext"
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

  useEffect(() => {
    load()
  }, [user])

  async function load() {
    if (!user?.id) {
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const data = await getOrCreateSubscription(user.id)
      setSubscription(data)
    } catch (error) {
      console.error("Erro ao carregar assinatura:", error)
    } finally {
      setLoading(false)
    }
  }

  const plan = subscription?.plan || "trial"
  const level = PLAN_LEVEL[plan]
  const trialExpired = isTrialExpired(subscription)
  const trialDaysLeft = getTrialDaysLeft(subscription)

  function hasPlan(required: PlanType) {
    if (!subscription) return false
    if (subscription.status === "trialing" && !trialExpired) return true
    if (!subscription.active) return false
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
