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

  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      user_id: userId,
      plan: "trial",
      status: "trialing",
      active: true,
    })
    .select()
    .single()

  if (error) throw error
  return data as Subscription
}

export async function updateSubscriptionPlan(
  userId: string,
  plan: PlanType,
  status: Subscription["status"] = "active"
) {
  const { data, error } = await supabase
    .from("subscriptions")
    .upsert({
      user_id: userId,
      plan,
      status,
      active: status === "active" || status === "trialing",
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data as Subscription
}

export function isTrialExpired(subscription?: Subscription | null) {
  if (!subscription) return false
  if (subscription.status !== "trialing") return false
  if (!subscription.trial_end) return false

  return new Date(subscription.trial_end).getTime() < Date.now()
}

export function getTrialDaysLeft(subscription?: Subscription | null) {
  if (!subscription?.trial_end) return 0

  const diff = new Date(subscription.trial_end).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}
