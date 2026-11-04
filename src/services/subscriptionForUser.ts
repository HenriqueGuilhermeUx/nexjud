import type { Subscription } from "./subscriptionService"

/** Never display subscription data returned for another authenticated user. */
export function subscriptionForUser(
  subscription: Subscription | null | undefined,
  userId: string | null | undefined
): Subscription | null {
  return subscription && userId && subscription.user_id === userId ? subscription : null
}
