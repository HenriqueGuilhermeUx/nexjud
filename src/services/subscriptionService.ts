import { supabase } from "@/lib/supabase"

export type PlanType = "trial" | "pro" | "intelligence" | "enterprise" | "enterprise_plus"

export interface Subscription {
  id?: string
  user_id: string
  plan: PlanType
  status: "trialing" | "active" | "past_due" | "canceled" | "expired"
  trial_start?: string
  trial_end?: string
  active: boolean
  payment_provider?: string
  provider_customer_id?: string
  provider_subscription_id?: string
  created_at?: string
  updated_at?: string
}

export const PLAN_LABELS: Record<PlanType, string> = {
  trial: "Trial",
  pro: "NexJud Pro",
  intelligence: "NexJud Intelligence",
  enterprise: "NexJud Enterprise",
  enterprise_plus: "Enterprise Plus",
}

export const PLAN_PRICES: Record<PlanType, string> = {
  trial: "7 dias grátis",
  pro: "R$ 197/mês",
  intelligence: "R$ 397/mês",
  enterprise: "R$ 797/mês",
  enterprise_plus: "R$ 1.497/mês",
}

export async function getOrCreateSubscription(userId: string) {
  const { data: existing, error: existingError } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (existingError) throw existingError
  if (existing) return existing as Subscription

  // Trial creation is server-controlled so the browser cannot self-assign billing state.
  const { data, error } = await supabase.functions.invoke("ensure-trial", {
    body: {},
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data as Subscription
}

export async function updateSubscriptionPlan(
  _userId: string,
  _plan: PlanType,
  _status: Subscription["status"] = "active"
) {
  throw new Error("Alteração de plano é controlada pelo servidor e pelo webhook de pagamento.")
}

export function isTrialExpired(subscription?: Subscription | null) {
  if (!subscription) return false
  if (subscription.status !== "trialing") return false
  if (!subscription.trial_end) return true

  return new Date(subscription.trial_end).getTime() < Date.now()
}

export function getTrialDaysLeft(subscription?: Subscription | null) {
  if (!subscription?.trial_end) return 0

  const diff = new Date(subscription.trial_end).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}
