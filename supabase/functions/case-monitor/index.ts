import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { formatCnj, onlyDigits } from "../_shared/cnj.ts"
import { djenByProcess, type DjenPublication } from "../_shared/djen.ts"
import { escavadorGet, escavadorPost } from "../_shared/escavador.ts"

// Monitor de processos e resumo por e-mail.
// Chamado pelo agendador da Netlify (netlify/functions/monitor-schedule.mjs) com o header
// x-nexjud-secret = MONITOR_CRON_SECRET.
//
// job "check" (de hora em hora, até 25 processos por vez, cada um no máximo 1x a cada 20 h):
//   1. DJEN do processo (gratuito): intimações, decisões e sentenças novas.
//   2. Escavador: cria o monitoramento semanal (R$ 0,32/processo/mês) na primeira vez;
//      quando o Escavador avisa novidade (escavador-webhook marca o caso), busca as
//      movimentações (R$ 0,05) e registra as novas.
//   3. Para o que é novo: a IA explica em português simples e sugere o próximo passo;
//      cria a notificação no app (automation_notifications).
// job "digest" (1x por dia): um e-mail por usuário com as notificações ainda não enviadas.
//
// Monitora casos de usuários em teste ou assinantes, até 100 processos por usuário.
// Em teste: só DJEN (gratuito). Assinantes: DJEN + monitoramento semanal do Escavador.

const MAX_CASES_PER_RUN = 25
const RECHECK_HOURS = 20
const MAX_MONITORED_PER_USER = 100
const APP_URL = "https://nexjudsolucoes.com.br"

// deno-lint-ignore no-explicit-any
type Any = any

type NewItem = { fingerprint: string; date: string | null; name: string; text: string; link: string | null; source: "djen" | "escavador"; kind?: string }

const json = (status: number, body: unknown) => Response.json(body, { status })

function paying(profile: Any) {
  if (!profile) return false
  const status = String(profile.subscription_status || "").toLowerCase()
  const premiumUntil = profile.premium_until ? new Date(profile.premium_until).getTime() : 0
  return profile.is_premium === true || status === "active" || status === "premium" || premiumUntil > Date.now()
}

function eligible(profile: Any) {
  if (!profile) return false
  const now = Date.now()
  const status = String(profile.subscription_status || "").toLowerCase()
  const premiumUntil = profile.premium_until ? new Date(profile.premium_until).getTime() : 0
  const trialEndsAt = profile.trial_ends_at ? new Date(profile.trial_ends_at).getTime() : 0
  return profile.is_premium === true || status === "active" || status === "premium" || premiumUntil > now || trialEndsAt > now
}

async function sha256(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("")
}

function sameSecret(a: string, b: string) {
  if (!a || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

type Explained = { fingerprint: string; summary: string; action: string; deadline: string | null; impact: "low" | "medium" | "high" | "critical" }

async function explain(caseTitle: string, items: NewItem[]): Promise<Map<string, Explained>> {
  const out = new Map<string, Explained>()
  const fallback = (i: NewItem): Explained => ({
    fingerprint: i.fingerprint,
    summary: `${i.name}${i.date ? ` (${new Date(i.date).toLocaleDateString("pt-BR")})` : ""}. Confira o teor no tribunal.`,
    action: "Abra a publicação e verifique se há prazo.",
    deadline: null,
    impact: /senten|decis|ac[óo]rd|intima/i.test(`${i.kind || ""} ${i.name}`) ? "high" : "medium",
  })
  const key = Deno.env.get("OPENAI_API_KEY")
  if (!key || !items.length) {
    for (const i of items) out.set(i.fingerprint, fallback(i))
    return out
  }
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(40_000),
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Você é um advogado brasileiro experiente avisando um colega sobre novidades nos processos dele. " +
              "Para cada item, explique em 1 a 2 frases simples o que aconteceu, diga o próximo passo prático e, se houver prazo provável, indique-o com a ressalva 'confirme no sistema do tribunal'. " +
              "Não invente fatos que não estejam no texto. Não dê percentuais nem previsão de resultado. " +
              "Responda em JSON: {items: [{fingerprint, summary, action, deadline (string ou null), impact ('low'|'medium'|'high'|'critical')}]}. " +
              "Use 'critical' para sentença, acórdão ou decisão com prazo curto; 'high' para decisão ou intimação com prazo; 'low' para mero expediente.",
          },
          {
            role: "user",
            content: `Processo: ${caseTitle}\n\n${JSON.stringify(items.slice(0, 8).map((i) => ({ fingerprint: i.fingerprint, data: i.date, tipo: i.name, texto: i.text.slice(0, 2000) })))}`,
          },
        ],
      }),
    })
    if (response.ok) {
      const data = await response.json()
      const parsed = JSON.parse(data?.choices?.[0]?.message?.content || "{}")
      for (const r of Array.isArray(parsed.items) ? parsed.items : []) {
        if (!r?.fingerprint) continue
        out.set(String(r.fingerprint), {
          fingerprint: String(r.fingerprint),
          summary: String(r.summary || "").slice(0, 600),
          action: String(r.action || "").slice(0, 400),
          deadline: r.deadline ? String(r.deadline).slice(0, 200) : null,
          impact: ["low", "medium", "high", "critical"].includes(r.impact) ? r.impact : "medium",
        })
      }
    }
  } catch { /* usa o texto padrão */ }
  for (const i of items) if (!out.has(i.fingerprint)) out.set(i.fingerprint, fallback(i))
  return out
}

function fromDjen(p: DjenPublication): NewItem {
  return {
    fingerprint: `djen:${p.id}`,
    date: p.date,
    name: [p.documentType || p.communicationType || "Publicação", p.judgingBody].filter(Boolean).join(" · "),
    text: p.text,
    link: p.link,
    source: "djen",
    kind: p.kind,
  }
}

async function checkCases(admin: Any, body: Any) {
  const limit = Math.max(1, Math.min(MAX_CASES_PER_RUN, Number(body.limit) || MAX_CASES_PER_RUN))
  const { data: cases, error } = await admin
    .from("legal_cases")
    .select("id,user_id,title,process_number,status,metadata,updated_at")
    .eq("status", "active")
    .not("process_number", "is", null)
    .neq("process_number", "")
    .order("updated_at", { ascending: true })
    .limit(400)
  if (error) throw error

  const now = Date.now()
  const due = (cases || []).filter((c: Any) => {
    const last = c.metadata?.monitor?.last_checked_at ? new Date(c.metadata.monitor.last_checked_at).getTime() : 0
    return c.metadata?.monitor?.escavador_pending || now - last > RECHECK_HOURS * 3600_000
  })
  const userIds = [...new Set(due.map((c: Any) => c.user_id))]
  const { data: profiles } = userIds.length
    ? await admin.from("profiles").select("id,is_premium,subscription_status,premium_until,trial_ends_at").in("id", userIds)
    : { data: [] }
  const okUsers = new Set((profiles || []).filter(eligible).map((p: Any) => p.id))
  // Escavador (pago) só para assinantes; em teste, só o DJEN (gratuito).
  const payingUsers = new Set((profiles || []).filter(paying).map((p: Any) => p.id))
  const perUser = new Map<string, number>()
  const batch = due.filter((c: Any) => {
    if (!okUsers.has(c.user_id)) return false
    const n = (perUser.get(c.user_id) || 0) + 1
    perUser.set(c.user_id, n)
    return n <= MAX_MONITORED_PER_USER
  }).slice(0, limit)

  const summary = { checked: 0, newItems: 0, notifications: 0, monitorsCreated: 0, escavadorReads: 0, errors: [] as string[] }

  for (const c of batch) {
    const cnj = onlyDigits(c.process_number)
    if (cnj.length !== 20) continue
    summary.checked++
    const monitor = { ...(c.metadata?.monitor || {}) }
    const firstRun = !monitor.initialized_at
    try {
      const fresh: NewItem[] = []

      // 1) DJEN (gratuito)
      const djen = await djenByProcess(cnj, 30)
      if (djen.ok) fresh.push(...djen.items.map(fromDjen))

      // 2) Escavador: monitoramento semanal + leitura quando houver aviso
      const useEscavador = payingUsers.has(c.user_id)
      const seedingEscavador = useEscavador && !monitor.escavador_first_read_at
      if (useEscavador && !monitor.escavador_monitor_id && !monitor.escavador_monitor_error) {
        const created = await escavadorPost<Any>("/monitoramentos/processos", { numero: formatCnj(cnj), frequencia: "SEMANAL" })
        if (created.ok) {
          monitor.escavador_monitor_id = String(created.data?.id ?? created.data?.monitoramento?.id ?? "")
          summary.monitorsCreated++
        } else if (created.status === 422 || created.status === 400) {
          monitor.escavador_monitor_error = `HTTP ${created.status}`
        }
      }
      if (useEscavador && (monitor.escavador_pending || !monitor.escavador_first_read_at)) {
        monitor.escavador_first_read_at = monitor.escavador_first_read_at || new Date().toISOString()
        const moves = await escavadorGet<Any>(`/processos/numero_cnj/${formatCnj(cnj)}/movimentacoes`, { limit: 20, ordem: "desc" })
        summary.escavadorReads++
        if (moves.credits > 0) {
          await admin.from("provider_usage").insert({ user_id: c.user_id, provider: "escavador", route: "monitor/movimentacoes", credits_cents: Math.round(moves.credits) })
        }
        if (moves.ok && Array.isArray(moves.data?.items)) {
          for (const m of moves.data.items) {
            fresh.push({
              fingerprint: `esc:${m?.id ?? await sha256(`${m?.data}|${m?.conteudo}`)}`,
              date: m?.data || null,
              name: m?.classificacao_predita?.nome || m?.tipo || "Movimentação",
              text: String(m?.conteudo || ""),
              link: null,
              source: "escavador",
            })
          }
        }
        monitor.escavador_pending = false
      }

      // 3) O que é novo para este caso
      const fingerprints = fresh.map((f) => f.fingerprint)
      const { data: known } = fingerprints.length
        ? await admin.from("legal_process_movement_events").select("fingerprint").eq("user_id", c.user_id).eq("case_id", c.id).in("fingerprint", fingerprints)
        : { data: [] }
      const knownSet = new Set((known || []).map((k: Any) => k.fingerprint))
      const novel = fresh.filter((f, i, arr) => !knownSet.has(f.fingerprint) && arr.findIndex((x) => x.fingerprint === f.fingerprint) === i)

      // Na primeira verificação, só avisa o que saiu nos últimos 3 dias (o resto vira histórico).
      const recentCut = Date.now() - 3 * 86_400_000
      const isRecent = (n: NewItem) => Boolean(n.date && new Date(n.date).getTime() >= recentCut)
      const toNotify = novel.filter((n) => (firstRun || (seedingEscavador && n.source === "escavador")) ? isRecent(n) : true)
      const explained = await explain(c.title || formatCnj(cnj), toNotify)

      for (const n of novel) {
        const e = explained.get(n.fingerprint)
        const { error: insErr } = await admin.from("legal_process_movement_events").insert({
          user_id: c.user_id,
          case_id: c.id,
          process_number: formatCnj(cnj),
          movement_date: n.date ? new Date(n.date).toISOString() : null,
          movement_name: n.name.slice(0, 300),
          movement_payload: { source: n.source, link: n.link, text: n.text.slice(0, 4000) },
          fingerprint: n.fingerprint,
          impact_level: e?.impact || "unknown",
          impact_summary: e?.summary || null,
          recommended_action: e?.action || null,
          notification_created: Boolean(e),
          analyzed_at: e ? new Date().toISOString() : null,
        })
        if (insErr) continue
        summary.newItems++
        if (!e) continue
        await admin.from("automation_notifications").insert({
          user_id: c.user_id,
          case_id: c.id,
          type: "process_movement",
          priority: e.impact === "critical" ? "critical" : e.impact === "high" ? "high" : e.impact === "low" ? "low" : "normal",
          title: `${c.title || formatCnj(cnj)}: ${n.name}`.slice(0, 200),
          message: [e.summary, e.action ? `Próximo passo: ${e.action}` : "", e.deadline ? `Prazo: ${e.deadline}` : ""].filter(Boolean).join("\n"),
          action_url: `/dashboard/decision-intelligence?cnj=${cnj}`,
          metadata: { source: n.source, link: n.link, process_number: formatCnj(cnj), date: n.date, deadline: e.deadline },
          status: "pending",
        })
        summary.notifications++
      }

      monitor.last_checked_at = new Date().toISOString()
      if (firstRun) monitor.initialized_at = monitor.last_checked_at
      await admin.from("legal_cases").update({ metadata: { ...(c.metadata || {}), monitor } }).eq("id", c.id)
    } catch (err) {
      summary.errors.push(`${c.id}: ${err instanceof Error ? err.message : String(err)}`.slice(0, 200))
    }
    await new Promise((r) => setTimeout(r, 1500)) // respeita o limite do DJEN
  }
  return summary
}

function escapeHtml(v: string) {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

async function sendDigests(admin: Any) {
  const stored = await admin.from("app_secrets").select("name,value").in("name", ["resend_api_key", "digest_from_email"])
  const secret = (name: string) => (stored.data || []).find((r: Any) => r.name === name)?.value || ""
  const resendKey = Deno.env.get("RESEND_API_KEY") || secret("resend_api_key")
  const from = Deno.env.get("DIGEST_FROM_EMAIL") || secret("digest_from_email") || "NexJud <avisos@notify.nexjudsolucoes.com.br>"
  if (!resendKey) return { sent: 0, skipped: "RESEND_API_KEY não configurada" }

  const { data: pending, error } = await admin
    .from("automation_notifications")
    .select("id,user_id,title,message,priority,metadata,action_url,created_at")
    .eq("status", "pending")
    .is("sent_at", null)
    .eq("type", "process_movement")
    .order("created_at", { ascending: true })
    .limit(1000)
  if (error) throw error
  const byUser = new Map<string, Any[]>()
  for (const n of pending || []) byUser.set(n.user_id, [...(byUser.get(n.user_id) || []), n])
  if (!byUser.size) return { sent: 0 }

  const { data: profiles } = await admin.from("profiles").select("id,name,email").in("id", [...byUser.keys()])
  const order: Record<string, number> = { critical: 0, high: 1, normal: 2, low: 3 }
  let sent = 0
  const failures: string[] = []
  for (const profile of profiles || []) {
    const list = (byUser.get(profile.id) || []).sort((a, b) => (order[a.priority] ?? 9) - (order[b.priority] ?? 9))
    if (!profile.email || !list.length) continue
    const first = String(profile.name || "").split(" ")[0] || "Olá"
    const urgent = list.filter((n) => n.priority === "critical" || n.priority === "high").length
    const subject = urgent
      ? `${urgent} ${urgent === 1 ? "novidade pede" : "novidades pedem"} atenção nos seus processos`
      : `${list.length} ${list.length === 1 ? "novidade" : "novidades"} nos seus processos`
    const items = list.slice(0, 20).map((n) => {
      const color = n.priority === "critical" ? "#dc2626" : n.priority === "high" ? "#d97706" : "#6366f1"
      const link = n.metadata?.link ? `<a href="${escapeHtml(n.metadata.link)}" style="color:#6366f1">ver no tribunal</a> · ` : ""
      return `<tr><td style="padding:14px 0;border-bottom:1px solid #eee">
        <div style="font-size:12px;font-weight:700;color:${color};text-transform:uppercase">${n.priority === "critical" ? "Urgente" : n.priority === "high" ? "Atenção" : "Novidade"}</div>
        <div style="font-size:15px;font-weight:700;color:#111;margin:4px 0">${escapeHtml(n.title)}</div>
        <div style="font-size:14px;color:#333;white-space:pre-line">${escapeHtml(n.message || "")}</div>
        <div style="font-size:13px;margin-top:6px">${link}<a href="${APP_URL}${escapeHtml(n.action_url || "/dashboard")}" style="color:#6366f1">abrir no NexJud</a></div>
      </td></tr>`
    }).join("")
    const html = `<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:24px">
      <p style="font-size:13px;color:#6366f1;font-weight:700;letter-spacing:1px">NEXJUD · RESUMO DO DIA</p>
      <h1 style="font-size:20px;color:#111;margin:6px 0 4px">${escapeHtml(first)}, isto mudou nos seus processos</h1>
      <p style="font-size:14px;color:#555;margin:0 0 12px">Lido no DJEN (CNJ) e nos tribunais. Prazos sugeridos: confirme sempre no sistema do tribunal.</p>
      <table style="width:100%;border-collapse:collapse">${items}</table>
      ${list.length > 20 ? `<p style="font-size:13px;color:#555">E mais ${list.length - 20} no app.</p>` : ""}
      <p style="margin-top:20px"><a href="${APP_URL}/dashboard" style="background:#6366f1;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700">Abrir meus processos</a></p>
      <p style="font-size:12px;color:#888;margin-top:24px">Você recebe este e-mail porque acompanha processos no NexJud. O NexJud não prevê nem garante resultados.</p>
    </div>`
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json", "Idempotency-Key": `digest-${profile.id}-${new Date().toISOString().slice(0, 10)}` },
      body: JSON.stringify({ from, to: [profile.email], subject, html }),
      signal: AbortSignal.timeout(20_000),
    })
    const ids = list.map((n) => n.id)
    if (response.ok) {
      await admin.from("automation_notifications").update({ status: "sent", sent_at: new Date().toISOString() }).in("id", ids)
      sent++
    } else {
      failures.push(`${response.status}`)
    }
  }
  return { sent, failures }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" })
  const admin = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "", { auth: { persistSession: false } })
  // O segredo pode vir do ambiente (MONITOR_CRON_SECRET) ou da tabela protegida app_secrets.
  let expected = Deno.env.get("MONITOR_CRON_SECRET") || ""
  if (!expected) {
    const { data } = await admin.from("app_secrets").select("value").eq("name", "monitor_cron").maybeSingle()
    expected = data?.value || ""
  }
  if (!sameSecret(req.headers.get("x-nexjud-secret") || "", expected)) return json(401, { error: "unauthorized" })
  const body = await req.json().catch(() => ({}))
  try {
    if (body.job === "digest") return json(200, { ok: true, ...(await sendDigests(admin)) })
    return json(200, { ok: true, ...(await checkCases(admin, body)) })
  } catch (error) {
    console.error("case-monitor", error instanceof Error ? error.message : String(error))
    return json(500, { error: "monitor_failed" })
  }
})
