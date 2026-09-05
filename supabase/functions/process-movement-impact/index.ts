import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-nexjud-secret",
}

function normalizeImpact(value: unknown) {
  const v = String(value || "unknown").toLowerCase()
  if (["low", "medium", "high", "critical"].includes(v)) return v
  if (/baixo/.test(v)) return "low"
  if (/m[eé]dio/.test(v)) return "medium"
  if (/alto/.test(v)) return "high"
  if (/cr[ií]tic/.test(v)) return "critical"
  return "unknown"
}

async function sha256(input: string) {
  const bytes = new TextEncoder().encode(input)
  const hash = await crypto.subtle.digest("SHA-256", bytes)
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("")
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  try {
    const body = await req.json().catch(() => ({}))
    const auth = req.headers.get("Authorization") || ""
    const suppliedSecret = req.headers.get("x-nexjud-secret") || ""
    const automationSecret = Deno.env.get("NEXJUD_AUTOMATION_SECRET") || ""
    const isAutomation = Boolean(automationSecret && suppliedSecret && suppliedSecret === automationSecret)

    const url = Deno.env.get("SUPABASE_URL")!
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""

    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } })
    const adminClient = isAutomation && serviceRole ? createClient(url, serviceRole) : userClient

    let userId = ""
    if (isAutomation) {
      userId = String(body.userId || "")
      if (!userId) throw new Error("userId obrigatório para automação")
    } else {
      const { data: { user } } = await userClient.auth.getUser()
      if (!user) throw new Error("Não autenticado")
      userId = user.id
    }

    const caseId = String(body.caseId || "")
    const movement = body.movement || {}
    if (!caseId) throw new Error("caseId obrigatório")
    if (!movement?.name) throw new Error("movement.name obrigatório")

    const { data: legalCase, error: caseError } = await adminClient
      .from("legal_cases")
      .select("*")
      .eq("id", caseId)
      .eq("user_id", userId)
      .single()
    if (caseError || !legalCase) throw new Error("Caso não encontrado")

    const rawFingerprint = JSON.stringify({
      caseId,
      processNumber: body.processNumber || legalCase.process_number || null,
      date: movement.date || null,
      name: movement.name,
      complement: movement.complement || null,
    })
    const fingerprint = await sha256(rawFingerprint)

    const { data: existing } = await adminClient
      .from("legal_process_movement_events")
      .select("*")
      .eq("user_id", userId)
      .eq("case_id", caseId)
      .eq("fingerprint", fingerprint)
      .maybeSingle()

    if (existing) {
      return new Response(JSON.stringify({ ok: true, deduplicated: true, event: existing }), {
        headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    const [{ data: dossier }, { data: previousEvents }, { data: precedentImpacts }, { data: outcomes }] = await Promise.all([
      adminClient.from("legal_case_dossiers").select("*").eq("user_id", userId).eq("case_id", caseId).maybeSingle(),
      adminClient.from("legal_process_movement_events").select("movement_date,movement_name,impact_level,impact_summary,recommended_action,created_at").eq("user_id", userId).eq("case_id", caseId).order("created_at", { ascending: false }).limit(15),
      adminClient.from("legal_case_precedent_impacts").select("*").eq("user_id", userId).eq("case_id", caseId).order("created_at", { ascending: false }).limit(10),
      adminClient.from("legal_case_outcomes").select("recommendation,lawyer_decision,action_taken,outcome,result_status,created_at").eq("user_id", userId).eq("case_id", caseId).order("created_at", { ascending: false }).limit(15),
    ])

    const key = Deno.env.get("OPENAI_API_KEY")
    let analysis: any = {
      impact_level: "medium",
      impact_summary: `Nova movimentação registrada: ${movement.name}`,
      strategic_effect: "Revisar o contexto processual e confirmar se a movimentação altera risco, prova, precedente ou estratégia.",
      recommended_action: "Revisar a movimentação no Dossiê Vivo.",
      should_refresh_dossier: true,
      notify: true,
      notification_title: "Nova movimentação processual",
      notification_message: `${legalCase.title || "Caso"}: ${movement.name}`,
    }

    if (key) {
      const context = {
        legalCase,
        movement,
        dossier: dossier || null,
        previousMovements: previousEvents || [],
        precedentImpacts: precedentImpacts || [],
        recentOutcomes: outcomes || [],
      }
      const prompt = `Você é o Process Movement Impact Agent do NexJud. Analise SOMENTE a nova movimentação processual e o contexto fornecido. Não invente prazo, decisão, efeito jurídico, obrigação, probabilidade, precedente ou fato ausente. Diferencie claramente o que a movimentação informa do que é inferência estratégica. Retorne JSON estrito com: impact_level (low|medium|high|critical), impact_summary string, strategic_effect string, recommended_action string, should_refresh_dossier boolean, notify boolean, notification_title string, notification_message string. Use high/critical apenas quando o contexto realmente justificar atenção prioritária. CONTEXTO=${JSON.stringify(context).slice(0, 100000)}`

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          temperature: 0.08,
          messages: [
            { role: "system", content: "Você é um agente jurídico conservador, auditável e orientado a impacto. Nunca invente efeitos processuais." },
            { role: "user", content: prompt },
          ],
        }),
      })
      if (!response.ok) throw new Error(`OpenAI ${response.status}: ${await response.text()}`)
      const ai = await response.json()
      analysis = JSON.parse(ai.choices?.[0]?.message?.content || "{}")
    }

    const impactLevel = normalizeImpact(analysis.impact_level)
    const eventPayload = {
      user_id: userId,
      case_id: caseId,
      process_number: body.processNumber || legalCase.process_number || null,
      movement_date: movement.date || null,
      movement_name: String(movement.name),
      movement_payload: movement,
      fingerprint,
      impact_level: impactLevel,
      impact_summary: analysis.impact_summary || null,
      strategic_effect: analysis.strategic_effect || null,
      recommended_action: analysis.recommended_action || null,
      should_refresh_dossier: analysis.should_refresh_dossier === true,
      analyzed_at: new Date().toISOString(),
    }

    const { data: savedEvent, error: saveError } = await adminClient
      .from("legal_process_movement_events")
      .insert(eventPayload)
      .select()
      .single()
    if (saveError) throw saveError

    if (dossier && analysis.should_refresh_dossier === true) {
      const timeline = Array.isArray(dossier.timeline) ? dossier.timeline : []
      const risks = Array.isArray(dossier.risks) ? dossier.risks : []
      const actions = Array.isArray(dossier.next_best_actions) ? dossier.next_best_actions : []

      const movementTimelineItem = {
        date: movement.date || new Date().toISOString(),
        event: String(movement.name),
        source: "movimentação processual monitorada",
      }
      const movementRisk = impactLevel === "high" || impactLevel === "critical"
        ? [{
            risk: analysis.impact_summary || String(movement.name),
            level: impactLevel,
            reason: analysis.strategic_effect || "Nova movimentação com potencial impacto estratégico.",
            mitigation: analysis.recommended_action || "Revisar estratégia.",
          }]
        : []
      const movementAction = analysis.recommended_action
        ? [{
            priority: impactLevel === "critical" ? 1 : impactLevel === "high" ? 2 : 3,
            action: analysis.recommended_action,
            why: analysis.strategic_effect || analysis.impact_summary || "Nova movimentação processual.",
            depends_on: "Revisão da movimentação processual",
          }]
        : []

      await adminClient
        .from("legal_case_dossiers")
        .update({
          timeline: [movementTimelineItem, ...timeline].slice(0, 100),
          risks: [...movementRisk, ...risks].slice(0, 60),
          next_best_actions: [...movementAction, ...actions].slice(0, 40),
          last_analyzed_at: new Date().toISOString(),
        })
        .eq("id", dossier.id)
        .eq("user_id", userId)
    }

    let notificationCreated = false
    if (analysis.notify === true || impactLevel === "high" || impactLevel === "critical") {
      const { error: notificationError } = await adminClient.from("automation_notifications").insert({
        user_id: userId,
        case_id: caseId,
        type: "process_movement",
        priority: impactLevel === "critical" ? "critical" : impactLevel === "high" ? "high" : "normal",
        title: analysis.notification_title || "Movimentação processual analisada",
        message: analysis.notification_message || analysis.impact_summary || String(movement.name),
        action_url: `/dashboard/live-dossier?caseId=${caseId}`,
        metadata: {
          movement_event_id: savedEvent.id,
          process_number: eventPayload.process_number,
          impact_level: impactLevel,
          recommended_action: analysis.recommended_action || null,
        },
      })
      if (notificationError) throw notificationError
      notificationCreated = true
      await adminClient
        .from("legal_process_movement_events")
        .update({ notification_created: true })
        .eq("id", savedEvent.id)
        .eq("user_id", userId)
    }

    return new Response(JSON.stringify({
      ok: true,
      deduplicated: false,
      event: { ...savedEvent, notification_created: notificationCreated },
      impact: { ...analysis, impact_level: impactLevel },
    }), { headers: { ...cors, "Content-Type": "application/json" } })
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
