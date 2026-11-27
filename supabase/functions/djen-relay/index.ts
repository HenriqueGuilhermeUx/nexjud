import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// Repasse de consultas ao DJEN a partir de São Paulo.
// O DJEN (comunicaapi.pje.jus.br) só aceita chamadas do Brasil; as demais funções
// chamam esta com o header x-region: sa-east-1.
// Só aceita a service role (chamada servidor a servidor) e só os filtros conhecidos.

const ALLOWED: Record<string, RegExp> = {
  numeroProcesso: /^\d{20}$/,
  siglaTribunal: /^[A-Z0-9]{2,8}$/,
  orgaoId: /^\d{1,12}$/,
  texto: /^[\p{L}\p{N} ]{2,60}$/u,
  dataDisponibilizacaoInicio: /^\d{4}-\d{2}-\d{2}$/,
  dataDisponibilizacaoFim: /^\d{4}-\d{2}-\d{2}$/,
  pagina: /^\d{1,3}$/,
  itensPorPagina: /^(?:[1-9]|[1-9]\d|100)$/,
}

function sameSecret(a: string, b: string) {
  if (!a || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

const json = (status: number, body: unknown) =>
  Response.json(body, { status, headers: { "x-djen-via": "relay", "cache-control": "no-store" } })

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" })
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "")
  if (!sameSecret(token, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "")) return json(401, { error: "unauthorized" })

  const body = await req.json().catch(() => ({}))
  const params = body?.params && typeof body.params === "object" ? body.params : {}
  const url = new URL("https://comunicaapi.pje.jus.br/api/v1/comunicacao")
  for (const [key, value] of Object.entries(params)) {
    const rule = ALLOWED[key]
    if (!rule || typeof value !== "string" || !rule.test(value)) return json(400, { error: "invalid_param", param: key })
    url.searchParams.set(key, value)
  }
  if (!url.searchParams.get("numeroProcesso") && !url.searchParams.get("orgaoId")) return json(400, { error: "missing_filter" })

  try {
    const upstream = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "NexJud/1.0 (consulta sob demanda)" },
      signal: AbortSignal.timeout(15_000),
    })
    const text = await upstream.text()
    return new Response(text, {
      status: upstream.status,
      headers: { "content-type": upstream.headers.get("content-type") || "application/json", "x-djen-via": "relay", "cache-control": "no-store" },
    })
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError"
    return json(timedOut ? 504 : 502, { error: timedOut ? "djen_timeout" : "djen_unreachable" })
  }
})
