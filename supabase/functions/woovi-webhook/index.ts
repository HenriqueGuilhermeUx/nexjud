import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"
import { findCorrelationID, isPaidEvent, amountMatchesSignedCharge, keepExistingPaidPlan, validPaidPlan } from "../_shared/wooviWebhookPolicy.ts"

function toBase64(bytes: ArrayBuffer) {
  let binary = ""
  for (const b of new Uint8Array(bytes)) binary += String.fromCharCode(b)
  return btoa(binary)
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

async function verifyHmac(rawBody: string, signature: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  )
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody))
  return safeEqual(toBase64(digest), signature)
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json({ ok: true, ignored: true, reason: "method_not_post" })
    }

    const rawBody = await req.text()
    const webhookSecret = Deno.env.get("WOOVI_WEBHOOK_SECRET") || ""
    const signature = req.headers.get("x-openpix-signature") || req.headers.get("X-OpenPix-Signature") || ""

    if (!webhookSecret) {
      return Response.json({ ok: false, error: "WOOVI_WEBHOOK_SECRET não configurado." }, { status: 500 })
    }
    if (!signature || !(await verifyHmac(rawBody, signature, webhookSecret))) {
      return Response.json({ ok: false, error: "invalid_webhook_signature" }, { status: 401 })
    }
    // Parse only after verifying the raw bytes. Never exempt test events from signature verification.
    const body = JSON.parse(rawBody || "{}")
    if (body.evento === "teste_webhook" || body.event === "teste_webhook") {
      return Response.json({ ok: true, test: true })
    }

    if (!isPaidEvent(body)) {
      return Response.json({
        ok: true,
        ignored: true,
        reason: "not_paid_event",
        event: body.event || body.evento || null,
        status: body?.charge?.status || body?.pixCharge?.status || body?.transaction?.status || body?.status || null,
      })
    }

    const correlationID = findCorrelationID(body)
    if (!correlationID) {
      return Response.json({ ok: true, ignored: true, reason: "correlationID_absent" })
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: order, error: orderError } = await supabase
      .from("payment_orders")
      .select("*")
      .eq("correlation_id", correlationID)
      .maybeSingle()

    if (orderError) throw orderError
    if (!order) {
      return Response.json({ ok: true, ignored: true, reason: "order_not_found", correlationID })
    }

    if (!validPaidPlan(order.plan) || !amountMatchesSignedCharge(body, order.amount_cents)) {
      return Response.json({ ok: false, error: "payment_order_mismatch" }, { status: 422 })
    }

    const now = new Date().toISOString()
    const { data: currentSubscription, error: readError } = await supabase
      .from("subscriptions")
      .select("plan,status,active")
      .eq("user_id", order.user_id)
      .maybeSingle()
    if (readError) throw readError

    const keepCurrent = keepExistingPaidPlan(currentSubscription, order.plan)
    if (order.status === "paid" && keepCurrent) {
      return Response.json({ ok: true, activated: true, duplicate: true })
    }

    // Activate the subscription FIRST. If this fails, leave the charge pending
    // so Woovi retries can complete the operation. Never acknowledge partial activation.
    if (!keepCurrent) {
      const { error: subscriptionError } = await supabase.from("subscriptions").upsert({
        user_id: order.user_id,
        plan: order.plan,
        status: "active",
        active: true,
        payment_provider: "woovi",
        provider_subscription_id: correlationID,
        updated_at: now,
      }, { onConflict: "user_id" })
      if (subscriptionError) throw subscriptionError
    }

    if (order.status !== "paid") {
      const { error: orderUpdateError } = await supabase
        .from("payment_orders")
        .update({ status: "paid", paid_at: now, raw: body })
        .eq("id", order.id)
        .neq("status", "paid")
      if (orderUpdateError) throw orderUpdateError
    }

    return Response.json({ ok: true, activated: true, duplicate: order.status === "paid" })
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Erro webhook" },
      { status: 500 },
    )
  }
})
