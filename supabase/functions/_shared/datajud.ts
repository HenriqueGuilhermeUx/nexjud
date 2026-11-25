// Chamada à API pública do DataJud com desvio pela Netlify.
//
// O DataJud limita (429) ou deixa sem resposta parte das chamadas vindas do Supabase.
// Se DATAJUD_PROXY_SECRET estiver configurado, a chamada vai primeiro pelo proxy
// netlify/functions/datajud-proxy.mjs (outra rede de saída). Se o proxy falhar por
// motivo dele (sem configuração, fora do ar), cai para a chamada direta, como antes.
// Respostas do próprio DataJud (200, 404, 429...) vindas pelo proxy são devolvidas
// como estão, sem retry automático de HTTP 429.

const DEFAULT_PROXY_URL = "https://nexjudsolucoes.com.br/api/datajud-proxy"
const TIMEOUT_MS = 20_000

export type DatajudResult = { response: Response; via: "netlify" | "direct" }

async function direct(alias: string, query: unknown, authorization: string): Promise<Response> {
  // CNJ 429 is authoritative: never retry automatically.
  return fetch(`https://api-publica.datajud.cnj.jus.br/api_publica_${alias}/_search`, {
      method: "POST",
      headers: { Authorization: authorization, "Content-Type": "application/json" },
      body: JSON.stringify(query),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
}

/** `authorization` é o valor completo do header (ex.: "APIKey xxx" ou a chave crua). */
export async function datajudSearch(alias: string, query: unknown, authorization: string): Promise<DatajudResult> {
  // Read runtime configuration without requiring Deno ambient types in the web CI.
  const denoEnv = (globalThis as { Deno?: { env?: { get(name: string): string | undefined } } }).Deno?.env
  const secret = denoEnv?.get("DATAJUD_PROXY_SECRET") || ""
  const proxyUrl = denoEnv?.get("DATAJUD_PROXY_URL") || DEFAULT_PROXY_URL
  if (secret) {
    try {
      const response = await fetch(proxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-nexjud-proxy-secret": secret,
          "x-datajud-authorization": authorization,
        },
        body: JSON.stringify({ alias, query }),
        // 2 tentativas de até 20 s no proxy + folga
        signal: AbortSignal.timeout(TIMEOUT_MS * 2 + 5_000),
      })
      if (response.headers.get("x-datajud-via") === "netlify" || response.status === 504) return { response, via: "netlify" }
      console.error("datajud proxy indisponível", response.status)
    } catch (error) {
      console.error("datajud proxy erro", error instanceof Error ? error.message : String(error))
    }
  }
  return { response: await direct(alias, query, authorization), via: "direct" }
}
