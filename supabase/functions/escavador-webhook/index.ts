import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { formatCnj } from "../_shared/cnj.ts"

// Recebe os callbacks do Escavador (URL cadastrada no painel da API, página de callbacks):
//   https://<projeto>.supabase.co/functions/v1/escavador-webhook?token=<ESCAVADOR_WEBHOOK_TOKEN>
// Não confia no conteúdo: só extrai os números CNJ e marca os casos monitorados para o
// case-monitor buscar as movimentações na próxima rodada (pela API, com a nossa chave).

const CNJ_RE = /\b(\d{7})-?(\d{2})\.?(\d{4})\.?(\d)\.?(\d{2})\.?(\d{4})\b/g

function sameSecret(a: string, b: string) {
  if (!a || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return Response.json({ error: "method_not_allowed" }, { status: 405 })
  const token = new URL(req.url).searchParams.get("token") || ""
  if (!sameSecret(token, Deno.env.get("ESCAVADOR_WEBHOOK_TOKEN") || "")) return Response.json({ error: "unauthorized" }, { status: 401 })

  const raw = (await req.text()).slice(0, 2_000_000)
  const numbers = new Set<string>()
  for (const m of raw.matchAll(CNJ_RE)) numbers.add(m.slice(1).join(""))
  if (!numbers.size) return Response.json({ ok: true, matched: 0 })

  const admin = createClient(Deno.env.get("SUPABASE_URL") || "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "", { auth: { persistSession: false } })
  const variants = [...numbers].slice(0, 50).flatMap((d) => [d, formatCnj(d)])
  const { data: cases } = await admin.from("legal_cases").select("id,metadata").in("process_number", variants).eq("status", "active")
  for (const c of cases || []) {
    const monitor = { ...((c.metadata as Record<string, unknown>)?.monitor as Record<string, unknown> || {}), escavador_pending: true, escavador_notified_at: new Date().toISOString() }
    await admin.from("legal_cases").update({ metadata: { ...(c.metadata || {}), monitor } }).eq("id", c.id)
  }
  return Response.json({ ok: true, matched: cases?.length || 0 })
})
