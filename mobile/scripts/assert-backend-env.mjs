// EAS Build hook: fail closed for every native build.
// This file is run by "eas-build-pre-install"; no EAS_BUILD environment
// sentinel is required. EAS_BUILD_PROFILE is the documented profile variable.
// Public client keys only. Do not print values from the environment.
const mode = process.env.EXPO_PUBLIC_NEXJUD_ENV;
const profile = process.env.EAS_BUILD_PROFILE;
const url = (process.env.EXPO_PUBLIC_SUPABASE_URL || "").trim();
const key = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "").trim();

function stop(reason) {
  console.error("NexJud EAS environment blocked: " + reason);
  process.exit(1);
}

if (!profile || !["preview", "production", "development", "ios-api-ci"].includes(profile)) {
  stop("build profile is missing or unsupported");
}

const expected = profile === "ios-api-ci" ? "production" : profile;
if (mode !== expected) stop("backend mode does not match EAS build profile");

if (mode !== "production") {
  if (!url || !key) stop("staging Supabase URL and public key are required");
  const local = mode === "development" &&
    /^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?\/?$/i.test(url);
  if (!url.startsWith("https://") && !local) stop("staging URL must use HTTPS");
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    stop("invalid staging URL");
  }
  if (parsed.hostname === "zoruralbsxrbsaicihzu.supabase.co") {
    stop("preview may not use production Supabase");
  }
  if (key.startsWith("sb_secret_")) stop("privileged keys are forbidden in Expo clients");
  // Supabase legacy JWTs carry project ref and role claims. Validate them
  // without storing or logging the key; modern sb_publishable keys stay opaque.
  const jwtParts = key.split(".");
  if (jwtParts.length === 3) {
    let claims;
    try {
      claims = JSON.parse(Buffer.from(jwtParts[1], "base64url").toString("utf8"));
    } catch {
      stop("invalid legacy JWT");
    }
    if (claims.ref === "zoruralbsxrbsaicihzu") {
      stop("production project key cannot be used for staging");
    }
    if (claims.role === "service_role") {
      stop("service_role keys are forbidden in Expo clients");
    }
  }
}
console.log("NexJud EAS backend preflight OK: " + mode);
