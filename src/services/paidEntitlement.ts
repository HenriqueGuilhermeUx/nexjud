/** Consistent Web entitlement rule for a confirmed, non-expired paid period.
 * Existing active records without an end date are legacy accounts pending manual
 * migration and MUST NOT be deleted/expired automatically.
 */
export type PaidEntitlement = {
  active?: boolean | null
  status?: string | null
  current_period_end?: string | null
}
export function paidEntitlementCurrent(sub: PaidEntitlement | null | undefined, now = Date.now()): boolean {
  if (sub?.active !== true || sub.status !== "active") return false
  if (!sub.current_period_end) return true // pre-migration records; review separately
  const end = Date.parse(sub.current_period_end)
  return Number.isFinite(end) && end > now
}
