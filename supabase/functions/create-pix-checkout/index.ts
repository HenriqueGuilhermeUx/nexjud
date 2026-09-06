import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const prices: Record<string, number> = {
  pro: 19700,
  intelligence: 39700,
  enterprise: 79700,
  enterprise_plus: 149700,
}

function extractChargePayload(json: any) {
  return json?.charge || json?.pixQrCode || json || {}
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    const WOOVI_API_TOKEN = Deno.env.get("WOOVI_API_TOKEN")

    if (!WOOVI_API_TOKEN) {
      return Response.json({ error: "WOOVI_API_TOKEN não configurado." }, { status: 500, headers: corsHeaders })
    }

    const authHeader = req.headers.get("Authorization") || ""
    if (!authHeader) {
      return Response.json({ error: "Não autenticado." }, { status: 401, headers: corsHeaders })
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return Response.json({ error: "Não autenticado." }, { status: 401, headers: corsHeaders })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const body = await req.json().catch(() => ({}))

    const plan = String(body.plan || "").trim()
    const customerEmail = String(user.email || "").trim()
    const customerName = String(body.customerName || user.user_metadata?.full_name || customerEmail || "Cliente NexJud").trim()
    const taxId = String(body.taxId || "").replace(/\D/g, "")

    if (!prices[plan]) throw new Error("Plano inválido.")
    if (!customerEmail) throw new Error("Email obrigatório.")

    const correlationID = crypto.randomUUID()
    const amount = prices[plan]

    const wooviBody: any = {
      correlationID,
      value: amount,
      comment: `Assinatura NexJud - ${plan}`,
      customer: { name: customerName, email: customerEmail },
      additionalInfo: [
        { key: "user_id", value: user.id },
        { key: "plan", value: plan },
      ],
    }

    if (taxId) {
      wooviBody.customer.taxID = {
        taxID: taxId,
        type: taxId.length > 11 ? "BR:CNPJ" : "BR:CPF",
      }
    }

    const response = await fetch("https://api.woovi.com/api/v1/charge", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WOOVI_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(wooviBody),
    })

    const json = await response.json().catch(() => ({}))
    if (!response.ok) {
      return Response.json({ error: "Erro ao criar cobrança Woovi.", status: response.status, raw: json }, { status: 500, headers: corsHeaders })
    }

    const charge = extractChargePayload(json)
    const brCode = charge.brCode || charge.brCodeBase64 || charge.pixCode || charge.paymentMethods?.pix?.brCode || json.brCode || ""
    const qrCodeImage = charge.qrCodeImage || charge.qrCodeImageUrl || charge.qrCode || charge.paymentMethods?.pix?.qrCodeImage || json.qrCodeImage || ""
    const paymentLink = charge.paymentLinkUrl || charge.paymentLink || charge.url || json.paymentLinkUrl || ""

    const { data: order, error } = await supabase
      .from("payment_orders")
      .insert({
        user_id: user.id,
        plan,
        amount_cents: amount,
        provider: "woovi",
        status: "pending",
        correlation_id: correlationID,
        br_code: brCode,
        qr_code_image: qrCodeImage,
        payment_link: paymentLink,
        raw: json,
      })
      .select()
      .single()

    if (error) throw error

    return Response.json({ order, brCode, qrCodeImage, paymentLink }, { headers: corsHeaders })
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Erro interno no checkout." }, { status: 500, headers: corsHeaders })
  }
})
