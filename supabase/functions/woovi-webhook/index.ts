import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

Deno.serve(async (req) => {
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const body = await req.json().catch(() => ({}))

    const charge = body.charge || body
    const correlationID =
      charge.correlationID ||
      charge.correlationId ||
      body.correlationID ||
      ""

    const status =
      charge.status ||
      body.status ||
      ""

    if (!correlationID) {
      return Response.json({ ok: false, error: "correlationID ausente" }, { status: 400 })
    }

    const paid =
      String(status).toLowerCase().includes("paid") ||
      String(status).toLowerCase().includes("completed") ||
      String(status).toLowerCase().includes("confirmed")

    if (!paid) {
      return Response.json({ ok: true, ignored: true, status })
    }

    const { data: order, error: orderError } = await supabase
      .from("payment_orders")
      .select("*")
      .eq("correlation_id", correlationID)
      .maybeSingle()

    if (orderError) throw orderError
    if (!order) {
      return Response.json({ ok: false, error: "Pedido não encontrado" }, { status: 404 })
    }

    await supabase
      .from("payment_orders")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        raw: body,
      })
      .eq("id", order.id)

    await supabase
      .from("subscriptions")
      .upsert({
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
