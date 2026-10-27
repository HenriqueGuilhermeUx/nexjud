/**
 * SERVER-ONLY NexJud USA Supabase backend boundary.
 *
 * A shared Supabase project's Auth service may be reused ONLY once the
 * separate USA-prefixed membership/entitlement/quota RLS contracts have been
 * independently audited. Never infer readiness from a matching URL or public
 * publishable key. No live queries or migrations occur here.
 */
export type USBackendMode = "dedicated_us_project" | "shared_nexjud_partition"
export interface USBackendSettings {
  mode: string
  url: string
  publishableKey: string
  expectedProjectRef: string
  /** Independent server-held pointer to the existing Brazilian Supabase project. */
  protectedBrazilProjectRef: string
  sharedPartitionReviewed: string
  /** Trusted runtime assertion, never a browser claim. */
  sharedScopeApproved: string
}
const REF=/^[a-z0-9]{20}$/
export function isUSBackendConfigurationApproved(s: USBackendSettings): boolean {
  if (!s || !REF.test(s.expectedProjectRef) || !REF.test(s.protectedBrazilProjectRef) ||
      typeof s.url!=="string" ||
      typeof s.publishableKey!=="string" ||
      !s.publishableKey.startsWith("sb_publishable_") ||
      s.publishableKey.length<20) return false
  try {
    const u=new URL(s.url)
    if (u.protocol!=="https:" ||
        u.hostname!==s.expectedProjectRef+".supabase.co" ||
        u.username || u.password || u.search || u.hash ||
        u.port || !["","/"].includes(u.pathname)) return false
  } catch { return false }
  if (s.mode==="dedicated_us_project") {
    // A dedicated US deployment is separately provisioned/attested outside
    // this function. Never reuse an unaudited shared DB by relabeling it.
    return s.expectedProjectRef!==s.protectedBrazilProjectRef &&
      s.sharedPartitionReviewed!=="true" && s.sharedScopeApproved!=="true"
  }
  if (s.mode==="shared_nexjud_partition") {
    return s.expectedProjectRef===s.protectedBrazilProjectRef &&
      s.sharedPartitionReviewed==="true" && s.sharedScopeApproved==="true"
  }
  return false
}
