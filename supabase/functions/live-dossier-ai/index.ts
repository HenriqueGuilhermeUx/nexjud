import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  const started = Date.now()
  try {
    const auth = req.headers.get("Authorization") || ""
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Não autenticado")
    const { caseId } = await req.json()
    if (!caseId) throw new Error("caseId obrigatório")

    const [{ data: legalCase }, { data: docs }, { data: chunks }, { data: precedents }] = await Promise.all([
      supabase.from("legal_cases").select("*").eq("id", caseId).eq("user_id", user.id).single(),
      supabase.from("knowledge_documents").select("id,title,file_name,content,summary,created_at").eq("user_id", user.id).eq("case_id", caseId).limit(30),
      supabase.from("knowledge_chunks").select("content,chunk_number,document_id").eq("user_id", user.id).eq("case_id", caseId).limit(120),
      supabase.from("legal_precedent_analyses").select("*").eq("user_id", user.id).eq("case_id", caseId).order("created_at", { ascending: false }).limit(10),
    ])
    if (!legalCase) throw new Error("Caso não encontrado")

    const context = { legalCase, documents: docs || [], chunks: chunks || [], precedentAnalyses: precedents || [] }
    const key = Deno.env.get("OPENAI_API_KEY")
    let result: any
    if (key) {
      const prompt = `Você é o orquestrador do NexJud Legal Operating System. Quatro agentes devem analisar o caso: CASE ANALYST (fatos, partes, questões e cronologia), EVIDENCE ANALYST (requisitos, provas, força e lacunas), PRECEDENT ANALYST (precedentes, aderência e distinguishing; nunca invente precedentes), STRATEGY ANALYST (riscos, teses, movimentos e próxima melhor ação). Trabalhe apenas com o contexto fornecido. Separe fato de inferência. Quando faltar dado, declare a lacuna. Retorne JSON estrito com: executive_summary string, facts array de {fact,source,confidence}, legal_issues array de strings, parties array, timeline array de {date,event,source}, evidence_map array de {requirement,evidence,strength,gap,recommended_action}, precedent_map array de {precedent,applicability,distinguishing,risk}, risks array de {risk,level,reason,mitigation}, strategy objeto {thesis,objective,arguments,defensive_moves,offensive_moves}, next_best_actions array de {priority,action,why,depends_on}, confidence_score inteiro 0-100. CONTEXTO: ${JSON.stringify(context).slice(0,110000)}`
      const r = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "gpt-4o-mini", response_format: { type: "json_object" }, temperature: 0.15, messages: [{ role: "system", content: "Você é um sistema de inteligência jurídica brasileiro. Não invente fatos, provas, fontes ou precedentes." }, { role: "user", content: prompt }] }) })
      if (!r.ok) throw new Error(`OpenAI ${r.status}: ${await r.text()}`)
      const ai = await r.json()
      result = JSON.parse(ai.choices?.[0]?.message?.content || "{}")
    } else {
      result = { executive_summary: legalCase.summary || `Dossiê de ${legalCase.title}`, facts: [], legal_issues: [], parties: [legalCase.client_name, legalCase.opponent_name].filter(Boolean), timeline: [], evidence_map: [], precedent_map: [], risks: legalCase.risk_level ? [{ risk: "Risco informado no cadastro", level: legalCase.risk_level, reason: "Cadastro do caso", mitigation: "Executar análise com IA" }] : [], strategy: {}, next_best_actions: [{ priority: 1, action: "Adicionar documentos e executar nova análise", why: "O contexto disponível é insuficiente", depends_on: "Documentos do caso" }], confidence_score: 25 }
    }

    const payload = { user_id: user.id, case_id: caseId, status: "ready", executive_summary: result.executive_summary, facts: result.facts || [], legal_issues: result.legal_issues || [], parties: result.parties || [], timeline: result.timeline || [], evidence_map: result.evidence_map || [], precedent_map: result.precedent_map || [], risks: result.risks || [], strategy: result.strategy || {}, next_best_actions: result.next_best_actions || [], confidence_score: result.confidence_score || 0, last_analyzed_at: new Date().toISOString() }
    const { data: dossier, error } = await supabase.from("legal_case_dossiers").upsert(payload, { onConflict: "user_id,case_id" }).select().single()
    if (error) throw error

    const agents = ["case", "evidence", "precedent", "strategy"]
    await supabase.from("legal_agent_runs").insert(agents.map(agent => ({ user_id: user.id, case_id: caseId, dossier_id: dossier.id, agent_type: agent, status: "completed", input_snapshot: { document_count: docs?.length || 0, chunk_count: chunks?.length || 0 }, output: agent === "case" ? { facts: result.facts, legal_issues: result.legal_issues, timeline: result.timeline } : agent === "evidence" ? { evidence_map: result.evidence_map } : agent === "precedent" ? { precedent_map: result.precedent_map } : { strategy: result.strategy, risks: result.risks, next_best_actions: result.next_best_actions }, confidence_score: result.confidence_score || 0, model: key ? "gpt-4o-mini" : "structural-fallback", duration_ms: Date.now() - started })))

    return new Response(JSON.stringify({ dossier, result }), { headers: { ...cors, "Content-Type": "application/json" } })
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } })
  }
})