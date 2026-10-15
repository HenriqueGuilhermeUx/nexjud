/** Pure input policy for a signed Woovi payment notification. Never trust client plan/amount. */
export const PAID_EVENTS = new Set(["OPENPIX:CHARGE_COMPLETED", "OPENPIX:TRANSACTION_RECEIVED"])
const VALID_PLANS = ["pro", "intelligence", "enterprise", "enterprise_plus"] as const
export type PaidPlan = typeof VALID_PLANS[number]
const PLAN_RANK: Record<PaidPlan, number> = { pro: 1, intelligence: 2, enterprise: 3, enterprise_plus: 4 }
export function validPaidPlan(value: unknown): value is PaidPlan {
  return typeof value === "string" && VALID_PLANS.some(plan => plan === value)
}
export function findCorrelationID(body: any): string {
  return String([
    body?.charge?.correlationID, body?.charge?.correlationId, body?.charge?.identifier,
    body?.pixCharge?.correlationID, body?.pixCharge?.correlationId,
    body?.transaction?.charge?.correlationID, body?.transaction?.charge?.correlationId,
    body?.transaction?.correlationID, body?.transaction?.correlationId,
    body?.correlationID, body?.correlationId,
  ].find(Boolean) || "").trim()
}
export function isPaidEvent(body: any): boolean {
  const event = String(body?.event || body?.evento || "").toUpperCase()
  const status = String(body?.charge?.status || body?.pixCharge?.status ||
    body?.transaction?.status || body?.status || "").toUpperCase()
  // Status-only notifications (including APPROVED) cannot prove settlement.
  // Require a documented paid event and reject contradictory charge statuses.
  if (!PAID_EVENTS.has(event)) return false
  if (status && !["COMPLETED", "PAID", "CONFIRMED"].includes(status)) return false
  return true
}
export function amountMatchesSignedCharge(body: any, amountCents: number): boolean {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) return false
  const value = body?.charge?.value ?? body?.pixCharge?.value ?? body?.transaction?.charge?.value
  // A signed event without the settled amount cannot prove the invoice was paid in full.
  // Such events require server-side reconciliation with the provider before activation.
  if (value === undefined || value === null) return false
  const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN
  return Number.isSafeInteger(numeric) && numeric === amountCents
}
/** Never downgrade access when an older, already-signed charge is delivered late. */
export function keepExistingPaidPlan(current: { plan?: string | null; status?: string | null; active?: boolean | null } | null, newPlan: string): boolean {
  if (!current || !current.active || current.status !== "active") return false
  if (!validPaidPlan(current.plan) || !validPaidPlan(newPlan)) return false
  return PLAN_RANK[current.plan] >= PLAN_RANK[newPlan]
}

/** Payment reconciliation is recoverable: a failed subscription write never marks an order paid. */
export async function activateSignedPaidOrder(args: {
 orderAlreadyPaid: boolean
 keepCurrentPlan: boolean
 activateSubscription: () => Promise<void>
 markOrderPaid: () => Promise<void>
}): Promise<{ duplicate: boolean }> {
 if (!args.keepCurrentPlan) await args.activateSubscription()
 if (!args.orderAlreadyPaid) await args.markOrderPaid()
 return { duplicate: args.orderAlreadyPaid }
}
