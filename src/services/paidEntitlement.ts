/** A confirmed, non-expired paid entitlement for NexJud Web.
 * Legacy active PAID plans without an end date remain available until
 * explicitly reconciled. A trial (even with status "active") is never paid.
 */
export type PaidEntitlement = {
  plan?: string | null
  active?: boolean | null
  status?: string | null
  current_period_end?: string | null
}
const PAID_PLANS = new Set(["pro", "intelligence", "enterprise", "enterprise_plus"])

export function paidEntitlementCurrent(sub: PaidEntitlement | null | undefined, now = Date.now()): boolean {
  if (sub?.active !== true || sub.status !== "active" || !PAID_PLANS.has(sub.plan ?? "")) return false
  if (!sub.current_period_end) return true // legacy paid tier; never apply this exception to trials
  const end = Date.parse(sub.current_period_end)
  return Number.isFinite(end) && end > now
}
