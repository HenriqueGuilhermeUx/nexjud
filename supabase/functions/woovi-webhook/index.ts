import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}))

    if (
      body.evento === "teste_webhook" ||
      body.event === "teste_webhook" ||
      body.event === "PIX_AUTOMATIC_APPROVED"
    ) {
      return Response.json({ ok: true, test: true })
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const charge = body.charge || body.pixCharge || body
    const correlationID =
      charge.correlationID ||
      charge.correlationId ||
      body.correlationID ||
      body.correlationId ||
      ""

    if (!correlationID) {
      return Response.json({ ok: true, ignored: true, reason: "correlationID ausente", body })
    }

    const status = String(charge.status || body.status || body.event || body.evento || "").toLowerCase()

    const paid =
      status.includes("paid") ||
      status.includes("completed") ||
      status.includes("confirmed") ||
      status.includes("approved")

    if (!paid) {
      return Response.json({ ok: true, ignored: true, status })
    }

    const { data: order, error: orderError } = await supabase
      .from("payment_orders")
      .select("*")
      .eq("correlation_id", correlationID)
      .maybeSingle()

    if (orderError) throw orderError
    if (!order) return Response.json({ ok: true, ignored: true, reason: "pedido não encontrado" })

    await supabase
      .from("payment_orders")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
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
      updated_at: new Date().toISOString(),
    })

    return Response.json({ ok: true })
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Erro webhook" },
      { status: 500 }
    )
  }
})
