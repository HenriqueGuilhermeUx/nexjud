/** Applies ONLY after the provider event is authenticated and matched to a stored invoice. */
export type PaidCycle = {
  verified: boolean
  contractMatched: boolean
  event: string
  status: string
  expectedCents: number
  paidCents: number
  cycleStart: string
  cycleEnd: string
  paidUntil: string | null
}
export function evaluatePaidCycle(input: PaidCycle): {extendUntil: string | null; reason: string} {
  if (!input.verified || !input.contractMatched) return {extendUntil:null,reason:"unverified"}
  if (input.event !== "PIX_AUTOMATIC_COBR_COMPLETED" || input.status !== "COMPLETED")
    return {extendUntil:null,reason:"not_paid"}
  if (!Number.isSafeInteger(input.expectedCents) || input.expectedCents <= 0 ||
      input.paidCents !== input.expectedCents) return {extendUntil:null,reason:"amount"}
  const start = Date.parse(input.cycleStart), end = Date.parse(input.cycleEnd)
  const previous = input.paidUntil === null ? -Infinity : Date.parse(input.paidUntil)
  if (!Number.isFinite(start) || !Number.isFinite(end) ||
      (input.paidUntil !== null && !Number.isFinite(previous)) ||
      end - start < 27 * 86400000 || end - start > 32 * 86400000)
    return {extendUntil:null,reason:"period"}
  if (end <= previous) return {extendUntil:null,reason:"duplicate"}
  return {extendUntil:new Date(end).toISOString(),reason:"settled"}
}
