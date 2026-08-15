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

    const { userId, caseId, caseFacts, legalIssue, precedentIds = [] } = await req.json()
    if (userId !== authData.user.id) throw new Error("Usuário inválido")
    if (!caseFacts?.trim() || !legalIssue?.trim()) throw new Error("Fatos e questão jurídica são obrigatórios")

    let precedentsQuery = admin.from("legal_precedents").select("*").eq("user_id", userId).limit(12)
    if (precedentIds.length) precedentsQuery = precedentsQuery.in("id", precedentIds)
    const { data: precedents = [], error: precedentsError } = await precedentsQuery
    if (precedentsError) throw precedentsError

    let caseData: any = null
    if (caseId) {
      const { data } = await admin.from("legal_cases").select("*").eq("id", caseId).eq("user_id", userId).maybeSingle()
      caseData = data
    }

    const precedentText = precedents.map((p: any, i: number) => `#${i + 1} ${p.title}\nTribunal: ${p.tribunal || "-"}\nTema/Número: ${p.tema || "-"} / ${p.numero || "-"}\nResumo: ${p.resumo || "-"}\nFundamento: ${p.fundamento || "-"}`).join("\n\n")

    const fallback = buildFallback(caseFacts, legalIssue, precedents)
    let result = fallback

    if (openaiKey) {
      const prompt = `Você é o motor Precedent Intelligence do NexJud. Analise APENAS com base nos fatos e precedentes fornecidos. Não invente fonte, tese, modulação, ratio ou status. Quando não houver dados suficientes, use \"não identificado\".\n\nCASO:\n${JSON.stringify(caseData || {})}\n\nFATOS:\n${caseFacts}\n\nQUESTÃO JURÍDICA:\n${legalIssue}\n\nPRECEDENTES:\n${precedentText || "Nenhum precedente fornecido"}\n\nRetorne JSON estrito com: applicability (strong|partial|weak|unknown), adherence_score (0-100), risk_level, strategy_summary, sources(array), precedent_items(array com precedent_id, precedent_title, precedent_reference, court, qualified_type, status, thesis, ratio, modulation, overcoming, adherence_score, supports_application, supports_distinguishing), fact_matrix(array com fact_name, case_fact, precedent_fact, relation equivalent|similar|different|unknown, materiality high|medium|low, note), evidence_matrix(array com requirement, evidence_found, evidence_strength strong|medium|weak|missing, gap, recommended_action), favorable_arguments(array), adverse_arguments(array), next_actions(array).`

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${openaiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "gpt-4o-mini", temperature: 0.15, response_format: { type: "json_object" }, messages: [{ role: "system", content: "Você é um analista jurídico rigoroso. Nunca fabrique fontes." }, { role: "user", content: prompt }] }),
      })
      if (response.ok) {
        const payload = await response.json()
        const raw = payload?.choices?.[0]?.message?.content
        if (raw) result = JSON.parse(raw)
      }
    }

    const { data: analysis, error: analysisError } = await admin.from("legal_precedent_analyses").insert({
      user_id: userId,
      case_id: caseId || null,
      title: `Análise de precedentes — ${legalIssue.slice(0, 80)}`,
      legal_issue: legalIssue,
      case_facts: caseFacts,
      applicability: result.applicability || "unknown",
      adherence_score: Number(result.adherence_score || 0),
      risk_level: result.risk_level || "não identificado",
      strategy_summary: result.strategy_summary || "",
      sources: result.sources || [],
      status: "completed",
      updated_at: new Date().toISOString(),
    }).select().single()
    if (analysisError) throw analysisError

    const analysisId = analysis.id
    if (result.precedent_items?.length) await admin.from("legal_precedent_analysis_items").insert(result.precedent_items.map((x: any) => ({ ...x, analysis_id: analysisId, user_id: userId })))
    if (result.fact_matrix?.length) await admin.from("legal_precedent_fact_matrix").insert(result.fact_matrix.map((x: any) => ({ ...x, analysis_id: analysisId, user_id: userId })))
    if (result.evidence_matrix?.length) await admin.from("legal_precedent_evidence_matrix").insert(result.evidence_matrix.map((x: any) => ({ ...x, analysis_id: analysisId, user_id: userId })))

    return new Response(JSON.stringify({ analysis, result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
})

function buildFallback(caseFacts: string, legalIssue: string, precedents: any[]) {
  const items = precedents.slice(0, 5).map((p: any) => ({ precedent_id: p.id, precedent_title: p.title, precedent_reference: p.numero || p.tema || null, court: p.tribunal || null, qualified_type: p.tema || null, status: "não identificado", thesis: p.fundamento || p.resumo || "não identificado", ratio: "não identificado", modulation: "não identificado", overcoming: "não identificado", adherence_score: 0, supports_application: "Requer análise fática detalhada.", supports_distinguishing: "Requer comparação entre fatos determinantes." }))
  return { applicability: "unknown", adherence_score: 0, risk_level: "não identificado", strategy_summary: `Análise criada para: ${legalIssue}. É necessário validar aderência fática, prova e status dos precedentes.`, sources: precedents.map((p:any)=>({ type:"precedent", id:p.id, title:p.title })), precedent_items: items, fact_matrix: [{ fact_name:"Fatos determinantes", case_fact:caseFacts, precedent_fact:"não identificado", relation:"unknown", materiality:"high", note:"Comparar com a moldura fática do precedente." }], evidence_matrix: [{ requirement:"Comprovação dos fatos determinantes", evidence_found:"não identificado", evidence_strength:"missing", gap:"Mapear documentos e provas do caso.", recommended_action:"Vincular documentos do caso e construir matriz probatória." }], favorable_arguments: [], adverse_arguments: [], next_actions:["Validar precedentes qualificados", "Comparar moldura fática", "Mapear provas e lacunas"] }
}
