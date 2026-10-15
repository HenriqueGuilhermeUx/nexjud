/**
 * Explicit consent to save a DataJud lookup in the user's history.
 * A lookup without opt-in must remain read-only at the application layer.
 */
export function historyUserIdForSearch(optedIn: boolean, userId?: string): string | undefined {
  if (!optedIn || !userId?.trim()) return undefined
  return userId.trim()
}
