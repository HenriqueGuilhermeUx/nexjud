// Cliente mínimo da Escavador Business API v2 (uso comercial conforme contrato).
// Documentação: https://api.escavador.com/v2/docs
// Cada resposta traz o custo em centavos no header Creditos-Utilizados.

const BASE = "https://api.escavador.com/api/v2"
const TIMEOUT_MS = 20_000

export type EscavadorResult<T> =
  | { ok: true; status: number; data: T; credits: number }
  | { ok: false; status: number; error: string; credits: number }

export function escavadorConfigured(): boolean {
  return Boolean(Deno.env.get("ESCAVADOR_API_KEY"))
}

export async function escavadorGet<T = unknown>(path: string, params?: Record<string, string | number | undefined>): Promise<EscavadorResult<T>> {
  const key = Deno.env.get("ESCAVADOR_API_KEY") || ""
  if (!key) return { ok: false, status: 0, error: "escavador_not_configured", credits: 0 }
  const url = new URL(`${BASE}${path}`)
  for (const [name, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== "") url.searchParams.set(name, String(value))
  }
  try {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json", "X-Requested-With": "XMLHttpRequest" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    const credits = Number(response.headers.get("creditos-utilizados") || 0) || 0
    const text = await response.text()
    if (!response.ok) {
      // 402 = sem saldo; 404 = processo não está na base do Escavador
      console.error("escavador", path.split("/").slice(0, 3).join("/"), response.status)
      return { ok: false, status: response.status, error: `escavador_${response.status}`, credits }
    }
    return { ok: true, status: response.status, data: JSON.parse(text) as T, credits }
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError"
    console.error("escavador", timedOut ? "timeout" : error instanceof Error ? error.message : String(error))
    return { ok: false, status: 0, error: timedOut ? "escavador_timeout" : "escavador_unreachable", credits: 0 }
  }
}
