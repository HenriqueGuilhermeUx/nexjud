/**
 * Pre-payment entitlement guard. Run only after verifying the Supabase user
 * and reading this user's subscription with service_role on the Edge Function.
 * No Woovi charge should be created when this returns a non-null reason.
 */
export type CheckoutSubscription = {
  plan?: string | null
  status?: string | null
  active?: boolean | null
  current_period_end?: string | null
}

const paidPlanRank: Record<string, number> = {
  pro: 1, intelligence: 2, enterprise: 3, enterprise_plus: 4,
}

export function checkoutEligibilityBlockReason(
  subscription: CheckoutSubscription | null,
  requestedPlan: string,
  nowMs = Date.now(),
): string | null {
  if (!subscription || subscription.active !== true || subscription.status !== "active") return null

  const plan = subscription.plan || ""
  const previousRank = paidPlanRank[plan] ?? 0
  const requestedRank = paidPlanRank[requestedPlan] ?? 0

  if (!requestedRank) return "Plano solicitado inválido."
  if (!previousRank) {
    // Trial and free subscriptions are not paid legacy entitlements.
    return plan === "trial" || plan === "free"
      ? null
      : "Não foi possível confirmar seu plano atual. Nenhuma cobrança foi gerada."
  }

  if (!subscription.current_period_end) {
    return "Sua assinatura existente precisa de conferência antes de uma nova cobrança. Nenhum Pix foi gerado; procure o suporte NexJud."
  }
  const currentEnd = Date.parse(subscription.current_period_end)
  if (!Number.isFinite(currentEnd)) {
    return "Não foi possível conferir a validade do plano atual. Nenhuma cobrança foi gerada."
  }
  if (currentEnd > nowMs && previousRank > requestedRank) {
    return "Você já possui um plano superior ativo. Fale com o suporte antes de mudar de plano; nenhum Pix foi gerado."
  }
  return null
}
