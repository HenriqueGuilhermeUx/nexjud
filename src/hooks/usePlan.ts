import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/context/AuthContext"
import { supabase } from "@/lib/supabase"
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

type InternalAccessLevel = "owner" | "admin" | "support"

export function usePlan() {
  const { user } = useAuth()
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [internalAccess, setInternalAccess] = useState<InternalAccessLevel | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [user])

  async function load() {
    if (!user?.id) {
      setSubscription(null)
      setInternalAccess(null)
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const [{ data: entitlement, error: entitlementError }, subscriptionResult] = await Promise.all([
        supabase
          .from("internal_access")
          .select("access_level, active")
          .eq("user_id", user.id)
          .eq("active", true)
          .maybeSingle(),
        getOrCreateSubscription(user.id).then(
          (data) => ({ data, error: null as unknown }),
          (error) => ({ data: null as Subscription | null, error })
        ),
      ])

      // During rollout the table may not exist yet; billing must continue to work normally.
      if (!entitlementError && entitlement?.active) {
        setInternalAccess(entitlement.access_level as InternalAccessLevel)
      } else {
        setInternalAccess(null)
      }

      if (subscriptionResult.data) {
        setSubscription(subscriptionResult.data)
      } else if (!entitlement?.active) {
        console.error("Erro ao carregar assinatura:", subscriptionResult.error)
      }
    } catch (error) {
      console.error("Erro ao carregar acesso:", error)
    } finally {
      setLoading(false)
    }
  }

  const isInternal = internalAccess !== null
  const plan: PlanType = isInternal ? "enterprise_plus" : (subscription?.plan || "trial")
  const level = PLAN_LEVEL[plan]
  const trialExpired = isInternal ? false : isTrialExpired(subscription)
  const trialDaysLeft = isInternal ? 0 : getTrialDaysLeft(subscription)

  function hasPlan(required: PlanType) {
    if (isInternal) return true
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
    [subscription, internalAccess]
  )

  return {
    subscription,
    plan,
    loading,
    trialExpired,
    trialDaysLeft,
    isInternal,
    internalAccess,
    refresh: load,
    hasPlan,
    ...permissions,
  }
}
