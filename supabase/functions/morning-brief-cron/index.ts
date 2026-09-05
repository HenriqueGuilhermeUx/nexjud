import { serve } from "https://deno.land/std@0.224.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-nexjud-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function todayInSaoPaulo() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

function eligibleProfile(profile: any) {
  const now = Date.now()
  const status = String(profile?.subscription_status || "").toLowerCase()
  const premiumUntil = profile?.premium_until ? new Date(profile.premium_until).getTime() : 0
  const trialEndsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at).getTime() : 0
  return (
    status === "active" ||
    status === "premium" ||
    premiumUntil > now ||
    trialEndsAt > now
  )
}

async function generateBrief(sb: any, userId: string) {
  const [cr, mr, or, dr, ir] = await Promise.all([
    sb.from("legal_cases").select("id,title,status,risk_level,success_probability,court,tags,created_at").eq("user_id", userId).limit(300),
    sb.from("legal_strategic_memories").select("case_id,area,issue,situation,strategy,result_status,result_summary,lesson,confidence_score,reusable,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
    sb.from("legal_case_outcomes").select("case_id,recommendation,lawyer_decision,action_taken,outcome,outcome_type,result_status,learned_lesson,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(500),
    sb.from("legal_case_dossiers").select("case_id,executive_summary,legal_issues,evidence_map,precedent_map,risks,strategy,next_best_actions,confidence_score,last_analyzed_at").eq("user_id", userId).limit(300),
    sb.from("legal_case_precedent_impacts").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200),
  ])

  for (const r of [cr, mr, or, dr, ir]) if (r.error) throw r.error

  const cases = cr.data || []
  const memories = mr.data || []
  const outcomes = or.data || []
  const dossiers = dr.data || []
  const impacts = ir.data || []
  const caseMap = Object.fromEntries(cases.map((c: any) => [c.id, c]))
  const gaps = dossiers.flatMap((d: any) => (d.evidence_map || [])
    .filter((e: any) => Boolean(e?.gap))
    .map((e: any) => ({ case_id: d.case_id, case_title: caseMap[d.case_id]?.title, requirement: e.requirement, gap: e.gap, recommended_action: e.recommended_action })))
  const risks = dossiers.flatMap((d: any) => (d.risks || []).map((r: any) => ({ case_id: d.case_id, case_title: caseMap[d.case_id]?.title, ...r })))
  const critical = risks.filter((r: any) => /alto|high|crit/i.test(String(r.level || ""))).slice(0, 20)

  const context = {
    metrics: {
      cases: cases.length,
      dossiers: dossiers.length,
      evidence_gaps: gaps.length,
      high_risks: critical.length,
      memories: memories.length,
      outcomes: outcomes.filter((o: any) => o.outcome).length,
      precedent_impacts: impacts.length,
    },
    cases,
    dossiers,
    critical_risks: critical,
    evidence_gaps: gaps.slice(0, 60),
    strategic_memories: memories.filter((m: any) => m.reusable).slice(0, 50),
    recent_outcomes: outcomes.slice(0, 80),
    precedent_impacts: impacts.slice(0, 50),
  }

  const key = Deno.env.get("OPENAI_API_KEY")
  if (!key) {
    return {
      answer: "Office Intelligence carregado em modo estrutural.",
      executive_summary: `${cases.length} casos, ${critical.length} riscos altos e ${gaps.length} lacunas probatórias identificadas.`,
      critical_cases: critical.slice(0, 5).map((x: any, i: number) => ({ case_id: x.case_id, title: x.case_title || "Caso", reason: x.risk || x.reason || "Risco relevante", priority: i + 1 })),
      evidence_alerts: gaps.slice(0, 5).map((x: any) => ({ case_id: x.case_id, title: x.case_title || "Caso", gap: x.gap || x.requirement, action: x.recommended_action || "Revisar prova" })),
      precedent_alerts: [],
      reusable_lessons: memories.filter((m: any) => m.reusable).slice(0, 5).map((m: any) => ({ case_id: m.case_id, lesson: m.lesson, why_relevant: m.issue || m.area || "Experiência institucional" })),
      priority_actions: [],
      confidence_score: 30,
    }
  }

  const prompt = `Você é o Office Intelligence Agent do NexJud. Produza o Morning Brief executivo de hoje usando SOMENTE os dados fornecidos. Não invente prazos, processos, decisões, precedentes, probabilidades ou causalidade. Memória estratégica é experiência operacional, não autoridade jurídica. Priorize risco, lacunas probatórias, impactos de precedentes e ações concretas. Associe recomendação ao case_id quando houver. Retorne JSON estrito: answer string, executive_summary string, critical_cases [{case_id,title,reason,priority}], evidence_alerts [{case_id,title,gap,action}], precedent_alerts [{case_id,title,reason,action}], reusable_lessons [{case_id,lesson,why_relevant}], priority_actions [{case_id,title,action,why,priority}], confidence_score 0-100. DADOS=${JSON.stringify(context).slice(0, 120000)}`

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      temperature: 0.1,
      messages: [
        { role: "system", content: "Você é um agente executivo jurídico conservador, auditável e orientado a ação." },
        { role: "user", content: prompt },
      ],
    }),
  })
  if (!r.ok) throw new Error(`OpenAI ${r.status}: ${await r.text()}`)
  const ai = await r.json()
  return JSON.parse(ai.choices?.[0]?.message?.content || "{}")
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })

  const started = Date.now()
  try {
    const suppliedSecret = req.headers.get("x-nexjud-secret") || ""
    const automationSecret = Deno.env.get("NEXJUD_AUTOMATION_SECRET") || ""
    if (!automationSecret || suppliedSecret !== automationSecret) {
      return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      })
    }

    const url = Deno.env.get("SUPABASE_URL")!
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const sb = createClient(url, serviceRole)
    const body = await req.json().catch(() => ({}))
    const limit = Math.min(Math.max(Number(body.limit || 100), 1), 500)
    const force = body.force === true
    const today = todayInSaoPaulo()

    const { data: profiles, error: profilesError } = await sb
      .from("profiles")
      .select("id,subscription_status,trial_ends_at,premium_until,onboarding_completed")
      .eq("onboarding_completed", true)
      .limit(limit)
    if (profilesError) throw profilesError

    const eligible = (profiles || []).filter(eligibleProfile)
    let generated = 0
    let skipped = 0
    let notified = 0
    const errors: any[] = []

    for (const profile of eligible) {
      try {
        if (!force) {
          const { data: existing } = await sb
            .from("legal_morning_briefs")
            .select("id")
            .eq("user_id", profile.id)
            .eq("brief_date", today)
            .maybeSingle()
          if (existing) {
            skipped++
            continue
          }
        }

        const brief = await generateBrief(sb, profile.id)
        const executiveSummary = brief.executive_summary || brief.answer || "Morning Brief pronto."

        const { data: saved, error: saveError } = await sb
          .from("legal_morning_briefs")
          .upsert({
            user_id: profile.id,
            brief_date: today,
            executive_summary: executiveSummary,
            payload: brief,
            status: "ready",
            read_at: null,
          }, { onConflict: "user_id,brief_date" })
          .select("id")
          .single()
        if (saveError) throw saveError
        generated++

        const { error: notificationError } = await sb.from("automation_notifications").insert({
          user_id: profile.id,
          type: "morning_brief",
          priority: "normal",
          title: "Seu Morning Brief está pronto",
          message: executiveSummary,
          action_url: "/dashboard/office-intelligence",
          metadata: { brief_id: saved.id, brief_date: today },
        })
        if (!notificationError) notified++
      } catch (e) {
        errors.push({ user_id: profile.id, error: e instanceof Error ? e.message : String(e) })
      }
    }

    return new Response(JSON.stringify({
      ok: errors.length === 0,
      date: today,
      eligible_users: eligible.length,
      generated,
      skipped,
      notified,
      errors,
      duration_ms: Date.now() - started,
    }), { headers: { ...cors, "Content-Type": "application/json" } })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e), duration_ms: Date.now() - started }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    })
  }
})
