import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const openaiKey = Deno.env.get("OPENAI_API_KEY")
    const admin = createClient(supabaseUrl, serviceRole)

    const authHeader = req.headers.get("Authorization") || ""
    const jwt = authHeader.replace("Bearer ", "")
    const { data: authData, error: authError } = await admin.auth.getUser(jwt)
    if (authError || !authData.user) throw new Error("Não autorizado")

    const { userId, precedentId, monitorId, eventTitle, eventDescription } = await req.json()
    if (userId !== authData.user.id) throw new Error("Usuário inválido")

    let precedent: any = null
    if (precedentId) {
      const { data } = await admin.from("legal_precedents").select("*").eq("id", precedentId).eq("user_id", userId).maybeSingle()
      precedent = data
    }

    let monitor: any = null
    if (monitorId) {
      const { data } = await admin.from("legal_precedent_monitors").select("*").eq("id", monitorId).eq("user_id", userId).maybeSingle()
      monitor = data
    }

    const { data: cases = [], error: casesError } = await admin
      .from("legal_cases")
      .select("id,title,client_name,process_number,opponent_name,court,risk_level,summary,tags,status")
      .eq("user_id", userId)
      .eq("status", "active")
      .limit(200)
    if (casesError) throw casesError

    const sourceText = [
      precedent?.title,
      precedent?.tribunal,
      precedent?.tema,
      precedent?.numero,
      precedent?.resumo,
      precedent?.fundamento,
      monitor?.theme,
      monitor?.court,
      monitor?.external_reference,
      eventTitle,
      eventDescription,
    ].filter(Boolean).join("\n")

    let impacts: any[] = []

    if (openaiKey && cases.length) {
      const compactCases = cases.map((c:any) => ({ id:c.id, title:c.title, client:c.client_name, process:c.process_number, court:c.court, summary:c.summary, tags:c.tags }))
      const prompt = `Você é o Impact Scanner do NexJud. Compare o novo precedente/evento com a carteira de casos. Não invente fatos. Para cada caso potencialmente afetado, retorne somente se houver conexão plausível. JSON estrito: {"impacts":[{"case_id":"uuid","impact_direction":"favorable|adverse|review|unknown","impact_score":0-100,"reason":"...","recommended_action":"..."}]}.\n\nPRECEDENTE/EVENTO:\n${sourceText || "não informado"}\n\nCASOS:\n${JSON.stringify(compactCases)}`
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${openaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-mini", temperature: 0.1, response_format: { type: "json_object" }, messages: [{ role: "system", content: "Seja conservador. Não marque impacto sem relação plausível entre tema/fatos do precedente e o caso." }, { role: "user", content: prompt }] }),
      })
      if (response.ok) {
        const payload = await response.json()
        const raw = payload?.choices?.[0]?.message?.content
        if (raw) impacts = JSON.parse(raw)?.impacts || []
      }
    }

    if (!impacts.length) impacts = lexicalFallback(sourceText, cases)

    const validCaseIds = new Set(cases.map((c:any) => c.id))
    impacts = impacts.filter((x:any) => validCaseIds.has(x.case_id)).slice(0, 100)

    if (impacts.length) {
      const rows = impacts.map((x:any) => ({
        user_id: userId,
        case_id: x.case_id,
        precedent_id: precedentId || monitor?.precedent_id || null,
        monitor_id: monitorId || null,
        impact_direction: ["favorable","adverse","review","unknown"].includes(x.impact_direction) ? x.impact_direction : "unknown",
        impact_score: Math.max(0, Math.min(100, Number(x.impact_score || 0))),
        reason: x.reason || "Impacto potencial identificado.",
        recommended_action: x.recommended_action || "Revisar o caso à luz do precedente.",
        status: "open",
        updated_at: new Date().toISOString(),
      }))
      const { error } = await admin.from("legal_case_precedent_impacts").insert(rows)
      if (error) throw error
    }

    return new Response(JSON.stringify({ scanned_cases: cases.length, impacts }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
})

function lexicalFallback(source: string, cases: any[]) {
  const tokens = source.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/).filter((x) => x.length > 4)
  const unique = [...new Set(tokens)]
  return cases.map((c:any) => {
    const text = JSON.stringify(c).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    const hits = unique.filter((t) => text.includes(t)).length
    const score = unique.length ? Math.round((hits / Math.min(unique.length, 12)) * 100) : 0
    if (hits < 2 || score < 20) return null
    return { case_id:c.id, impact_direction:"review", impact_score:Math.min(score, 70), reason:`Correspondência temática preliminar em ${hits} elementos.`, recommended_action:"Executar Precedent Intelligence para confirmar aderência fática, distinguishing e impacto probatório." }
  }).filter(Boolean)
}
