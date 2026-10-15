// EAS Build hook: never ship a preview with an accidental production backend.
// All values are public Expo client settings; never log keys.
if (process.env.EAS_BUILD) {
  const mode = process.env.EXPO_PUBLIC_NEXJUD_ENV
  const profile = process.env.EAS_BUILD_PROFILE
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || ""
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ""
  function stop(reason) { console.error("NexJud EAS environment blocked: " + reason); process.exit(1) }
  if (!["production", "preview", "development"].includes(mode)) stop("unrecognized backend mode")
  if (profile === "preview" && mode !== "preview") stop("preview build requires preview mode")
  if (profile === "production" && mode !== "production") stop("production build requires production mode")
  if (mode !== "production") {
    if (!url || !key) stop("separate test Supabase URL and public key not configured")
    const local = mode === "development" && /^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?\/?$/i.test(url)
    if (!url.startsWith("https://") && !local) stop("preview backend must use HTTPS")
    try {
      if (new URL(url).hostname === "zoruralbsxrbsaicihzu.supabase.co") stop("preview points to production")
    } catch { stop("invalid preview URL") }
  }
  console.log("NexJud EAS environment verified: " + mode)
}
