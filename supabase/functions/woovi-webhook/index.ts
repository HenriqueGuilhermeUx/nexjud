import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

function findCorrelationID(body: any) {
  const candidates = [
    body?.charge?.correlationID,
    body?.charge?.correlationId,
    body?.charge?.identifier,
    body?.pixCharge?.correlationID,
    body?.pixCharge?.correlationId,
    body?.transaction?.charge?.correlationID,
    body?.transaction?.charge?.correlationId,
    body?.transaction?.correlationID,
    body?.transaction?.correlationId,
    body?.correlationID,
    body?.correlationId,
  ]

  return String(candidates.find(Boolean) || "")
}

function isPaidEvent(body: any) {
  const event = String(body?.event || body?.evento || "").toUpperCase()
  const status = String(
    body?.charge?.status ||
      body?.pixCharge?.status ||
      body?.transaction?.status ||
      body?.status ||
      ""
  ).toUpperCase()

  return (
    event === "OPENPIX:TRANSACTION_RECEIVED" ||
    event === "OPENPIX:CHARGE_COMPLETED" ||
    event.includes("TRANSACTION_RECEIVED") ||
    status === "COMPLETED" ||
    status === "PAID" ||
    status === "CONFIRMED" ||
    status === "APPROVED"
  )
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return Response.json({ ok: true, ignored: true, reason: "method_not_post" })
    }

    const body = await req.json().catch(() => ({}))

    if (
      body.evento === "teste_webhook" ||
      body.event === "teste_webhook" ||
      body.event === "PIX_AUTOMATIC_APPROVED"
    ) {
      return Response.json({ ok: true, test: true })
    }

    if (!isPaidEvent(body)) {
      return Response.json({
        ok: true,
        ignored: true,
        reason: "not_paid_event",
        event: body.event || body.evento || null,
        status:
          body?.charge?.status ||
          body?.pixCharge?.status ||
          body?.transaction?.status ||
          body?.status ||
          null,
      })
    }

    const correlationID = findCorrelationID(body)

    if (!correlationID) {
      return Response.json({
        ok: true,
        ignored: true,
        reason: "correlationID_absent",
        body,
      })
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
      return Response.json({
        ok: true,
        ignored: true,
        reason: "order_not_found",
        correlationID,
      })
    }

    const now = new Date()
    const expiresAt = new Date(now)
    expiresAt.setMonth(expiresAt.getMonth() + 1)

    await supabase
      .from("payment_orders")
      .update({
        status: "paid",
        paid_at: now.toISOString(),
        raw: body,
      })
      .eq("id", order.id)

    await supabase.from("subscriptions").upsert({
      user_id: order.user_id,
      plan: order.plan,
      status: "active",
      active: true,
      payment_provider: "woovi",
      provider_subscription_id: correlationID,
      updated_at: now.toISOString(),
    })

    return Response.json({
      ok: true,
      activated: true,
      user_id: order.user_id,
      plan: order.plan,
      correlationID,
    })
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Erro webhook",
      },
      { status: 500 }
    )
  }
})
