/**
 * NexJud USA private pilot — browser-side status contract, NOT a deployed UI.
 * Does not sign in, store credentials, call CourtListener or access Brazilian tables.
 * A trusted authenticated caller provides a short-lived Supabase access token.
 */
export type USPilotStatus =
  | { state: "ACTIVE_PILOT"; role: "firm_admin" | "lawyer" | "researcher" | "other"; legalSearchAvailable: false; predictiveModelAvailable: false }
  | { state: "UNAVAILABLE" | "UNAUTHENTICATED" | "NOT_AUTHORIZED" }

export async function fetchUSPilotStatus(
  endpoint: string,
  bearerToken: string,
  options: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<USPilotStatus> {
  const unavailable: USPilotStatus = { state: "UNAVAILABLE" }
  let target: URL
  try {
    target = new URL(endpoint)
    if (target.protocol !== "https:" ||
        !/^[a-z0-9]{20}\.supabase\.co$/.test(target.hostname) ||
        !/^\/functions\/v1\/usa-pilot-access$/.test(target.pathname) ||
        target.port || target.username || target.password ||
        target.hash || target.search) return unavailable
  } catch { return unavailable }
  if (typeof bearerToken !== "string" || !bearerToken ||
      bearerToken.length > 8000 || /\s/.test(bearerToken)) return unavailable
  const timeoutMs = options.timeoutMs ?? 7000
  if (!Number.isInteger(timeoutMs) || timeoutMs < 500 || timeoutMs > 15000) return unavailable
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await (options.fetchImpl ?? fetch)(target.href, {
      method: "GET",
      redirect: "error",
      cache: "no-store",
      credentials: "omit",
      signal: controller.signal,
      headers: {
        Authorization: "Bearer " + bearerToken,
        Accept: "application/json",
      },
    })
    if (response.status === 401) return { state: "UNAUTHENTICATED" }
    if (response.status === 403) return { state: "NOT_AUTHORIZED" }
    if (response.status !== 200) return unavailable
    // Fail closed if backend returns unexpected fields or changes its contract.
    const body: unknown = await response.json()
    if (!body || typeof body !== "object" || Array.isArray(body)) return unavailable
    const value = body as Record<string, unknown>
    if (Object.keys(value).sort().join(",") !==
        "access,legalSearchAvailable,predictiveModelAvailable,role") return unavailable
    if (value.access !== "ACTIVE_PILOT" ||
        !["firm_admin","lawyer","researcher","other"].includes(String(value.role)) ||
        value.legalSearchAvailable !== false ||
        value.predictiveModelAvailable !== false) return unavailable
    return {
      state: "ACTIVE_PILOT",
      role: value.role as "firm_admin" | "lawyer" | "researcher" | "other",
      legalSearchAvailable: false,
      predictiveModelAvailable: false,
    }
  } catch {
    return unavailable
  } finally {
    clearTimeout(timeout)
  }
}
