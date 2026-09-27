import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const allowedProviders = new Set(["docwallet", "nexoffice", "nextgen"])
const allowedEvents = new Set([
  "document.signed",
  "signature.completed",
  "obligation.completed",
  "payment.completed",
  "charge.completed",
  "charge.expired",
])

function env(name: string) { return Deno.env.get(name) || "" }
function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } })
}
function safeEqual(a: string, b: string) {
  if (!a || !b || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" })
  if (env("NEXJUD_CLOSED_LOOP_OUTCOMES_ENABLED") !== "true") return json(503, { ok: false, error: "capability_disabled" })

  const expected = env("NEXJUD_ECOSYSTEM_INGEST_KEY")
  const supplied = req.headers.get("x-nexjud-ecosystem-key") || ""
  if (!expected || !safeEqual(expected, supplied)) return json(401, { ok: false, error: "unauthorized" })

  let body: any
  try { body = await req.json() } catch { return json(400, { ok: false, error: "invalid_json" }) }

  const provider = String(body?.provider || "").toLowerCase()
  const eventType = String(body?.eventType || "")
  const externalEventId = String(body?.externalEventId || "").trim()
  const userId = String(body?.userId || "").trim()
  const caseId = String(body?.caseId || "").trim()
  if (!allowedProviders.has(provider)) return json(422, { ok: false, error: "provider_not_allowed" })
  if (!allowedEvents.has(eventType)) return json(422, { ok: false, error: "event_not_allowed" })
  if (!externalEventId || !userId || !caseId) return json(422, { ok: false, error: "identity_required" })

  // Never accept raw documents/text, credentials or arbitrary provider payloads.
  const normalized = {
    user_id: userId,
    case_id: caseId,
    provider,
    event_type: eventType,
    external_event_id: externalEventId,
    status: "confirmed",
    document_ref: body?.documentRef ? String(body.documentRef).slice(0, 500) : null,
    payment_ref: body?.paymentRef ? String(body.paymentRef).slice(0, 500) : null,
    occurred_at: body?.occurredAt || null,
    payload: {
      amount: typeof body?.amount === "number" ? body.amount : undefined,
      currency: body?.currency ? String(body.currency).slice(0, 12) : undefined,
      signatureMode: body?.signatureMode ? String(body.signatureMode).slice(0, 80) : undefined,
      evidenceHash: body?.evidenceHash ? String(body.evidenceHash).slice(0, 256) : undefined,
      obligationRef: body?.obligationRef ? String(body.obligationRef).slice(0, 500) : undefined,
    },
  }

  const admin = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } })
  const { data: legalCase } = await admin.from("legal_cases").select("id,user_id").eq("id", caseId).eq("user_id", userId).maybeSingle()
  if (!legalCase) return json(404, { ok: false, error: "case_not_found" })

  const { data: existing } = await admin.from("legal_external_outcome_events").select("id,status").eq("provider", provider).eq("external_event_id", externalEventId).maybeSingle()
  if (existing) return json(200, { ok: true, reused: true, eventId: existing.id })

  const { data: event, error } = await admin.from("legal_external_outcome_events").insert(normalized).select("id").single()
  if (error) return json(500, { ok: false, error: "event_store_failed" })

  // Mirror only a conservative, human-readable confirmed fact into Outcome Intelligence.
  const outcomeText: Record<string,string> = {
    "document.signed": "Documento assinado confirmado pelo motor documental.",
    "signature.completed": "Assinatura concluída confirmada pelo motor documental.",
    "obligation.completed": "Cumprimento de obrigação confirmado pelo sistema operacional.",
    "payment.completed": "Pagamento confirmado pelo motor financeiro.",
    "charge.completed": "Cobrança paga confirmada pelo motor financeiro.",
    "charge.expired": "Cobrança expirada informada pelo motor financeiro.",
  }
  const resultStatus = eventType === "charge.expired" ? "pending" : "confirmed"
  const { data: outcome, error: outcomeError } = await admin.from("legal_case_outcomes").insert({
    user_id: userId,
    case_id: caseId,
    outcome: outcomeText[eventType],
    outcome_type: "external_confirmed_event",
    result_status: resultStatus,
    source: provider,
  }).select("id").single()

  if (outcomeError) return json(202, { ok: true, eventId: event.id, outcomeRecorded: false })
  return json(201, { ok: true, reused: false, eventId: event.id, outcomeId: outcome.id, outcomeRecorded: true })
})
