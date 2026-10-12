import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
}
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers })

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers })
  if (req.method !== "POST") return reply({ error: "Método não permitido." }, 405)
  try {
    const url = Deno.env.get("SUPABASE_URL")
    const anon = Deno.env.get("SUPABASE_ANON_KEY")
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    if (!url || !anon || !serviceRole) return reply({ error: "Serviço indisponível." }, 503)
    const bearer = req.headers.get("authorization") || ""
    if (!/^Bearer\s+\S+$/i.test(bearer)) return reply({ error: "Autenticação necessária." }, 401)
    const authClient = createClient(url, anon, { auth: { persistSession: false } })
    const { data: auth, error: authError } = await authClient.auth.getUser(bearer.replace(/^Bearer\s+/i, ""))
    if (authError || !auth.user) return reply({ error: "Sessão inválida." }, 401)

    const body = await req.json().catch(() => ({}))
    const theme = String(body.theme || "").trim().slice(0, 500)
    const court = String(body.court || "").trim().slice(0, 80)
    const period = String(body.period || "").trim().slice(0, 80)
    const camara = String(body.camara || "").trim().slice(0, 80)
    const materia = String(body.materia || "").trim().slice(0, 80)
    if (!theme || !court) return reply({ error: "Informe tema e tribunal." }, 400)

    const escavadorKey = Deno.env.get("ESCAVADOR_API_KEY")
    if (!escavadorKey) return reply({ error: "Fonte jurisprudencial não configurada." }, 503)
    const query = new URLSearchParams({ q: theme, tribunal: court, limit: "20" })
    const upstream = await fetch(`https://api.escavador.com/api/v1/jurisprudencias?${query}`, {
      headers: { Authorization: `Bearer ${escavadorKey}`, Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    })
    if (!upstream.ok) return reply({ error: "Fonte jurisprudencial temporariamente indisponível." }, 502)
    const payload = await upstream.json()
    const raw = Array.isArray(payload?.data) ? payload.data : []
    const decisions = raw.map((entry: Record<string, unknown>) => ({
      title: String(entry.titulo || entry.descricao || "Decisão sem título").slice(0, 300),
      court: String(entry.tribunal || court).slice(0, 80),
      result: entry.resultado ? String(entry.resultado).slice(0, 200) : null,
      sourceId: entry.id ? String(entry.id) : null,
      sourceUrl: typeof entry.url === "string" && /^https?:\/\//.test(entry.url) ? entry.url : null,
    }))
    const result = {
      theme, decisionsCount: decisions.length,
      analysis: decisions.length
        ? `Foram recuperados ${decisions.length} registros da fonte consultada. Confira o inteiro teor antes de extrair tendências ou estimar resultados.`
        : "Nenhuma decisão foi encontrada na fonte consultada para os filtros informados.",
      trend: "NEUTRO",
      successRate: null,
      heatmap: { zonaVerde: [], zonaAmarela: [], zonaVermelha: [] },
      recommendations: ["Verifique a origem e o inteiro teor de cada decisão antes de utilizar na estratégia."],
      decisions,
      source: "Escavador",
      warning: "Sem modelo estatístico validado. Não há taxa de êxito calculada nem tendência inferida.",
    }
    const admin = createClient(url, serviceRole, { auth: { persistSession: false } })
    const { error: saveError } = await admin.from("analysis_history").insert({
      user_id: auth.user.id,
      type: "jurisprudence",
      input_data: { theme, court, period, camara, materia },
      result,
    })
    if (saveError) console.error("analysis_history insert failed", saveError.code)
    return reply(result)
  } catch (error) {
    console.error("search-jurisprudence failed", error instanceof Error ? error.name : "unknown")
    return reply({ error: "Não foi possível concluir a pesquisa jurisprudencial." }, 502)
  }
})
