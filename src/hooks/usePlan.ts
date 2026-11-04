import { useEffect, useMemo, useRef, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { paidEntitlementCurrent } from "@/services/paidEntitlement"
import { subscriptionForUser } from "@/services/subscriptionForUser"
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
  const [subscriptionError, setSubscriptionError] = useState(false)
  // An old request must never publish a previous account's subscription after sign-out/account switch.
  const requestVersion = useRef(0)

  useEffect(() => {
    const version = ++requestVersion.current
    setSubscription(null)
    setSubscriptionError(false)
    if (!user?.id) {
      setLoading(false)
      return () => { requestVersion.current++ }
    }
    setLoading(true)
    getOrCreateSubscription(user.id).then((data) => {
      if (requestVersion.current === version) {
        const owned = subscriptionForUser(data, user.id)
        setSubscription(owned)
        setSubscriptionError(!owned)
      }
    }).catch((error) => {
      if (requestVersion.current === version) {
        setSubscription(null)
        setSubscriptionError(true)
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
      setSubscriptionError(false)
      setLoading(false)
      return
    }
    setLoading(true)
    setSubscriptionError(false)
    try {
      const data = await getOrCreateSubscription(userId)
      if (requestVersion.current === version) {
        const owned = subscriptionForUser(data, userId)
        setSubscription(owned)
        setSubscriptionError(!owned)
      }
    } catch (error) {
      if (requestVersion.current === version) {
        setSubscription(null)
        setSubscriptionError(true)
        console.error("Erro ao carregar assinatura:", error)
      }
    } finally {
      if (requestVersion.current === version) setLoading(false)
    }
  }

  // Filter at render time too: React can render the new user before the effect clears old state.
  const currentSubscription = subscriptionForUser(subscription, user?.id)
  const plan = currentSubscription?.plan || "trial"
  const level = PLAN_LEVEL[plan]
  const trialExpired = isTrialExpired(currentSubscription)
  const trialDaysLeft = getTrialDaysLeft(currentSubscription)

  function hasPlan(required: PlanType) {
    if (!currentSubscription) return false
    if (currentSubscription.status === "trialing" && !trialExpired && currentSubscription.active) return true
    if (!paidEntitlementCurrent(currentSubscription)) return false
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
    [currentSubscription, trialExpired, level]
  )

  return {
    subscription: currentSubscription,
    plan,
    loading,
    subscriptionError,
    trialExpired,
    trialDaysLeft,
    refresh: load,
    hasPlan,
    ...permissions,
  }
}
