/**
 * Only allow explicit, internal post-auth destinations. No arbitrary URLs.
 * Keep first-use onboarding as a prerequisite for checkout navigation.
 */
export function postLoginDestination(next: string | null, onboardingDone: boolean): string {
  if (!onboardingDone) return next === "/pricing" ? "/welcome?next=%2Fpricing" : "/welcome"
  return next === "/pricing" ? "/pricing" : "/dashboard"
}
