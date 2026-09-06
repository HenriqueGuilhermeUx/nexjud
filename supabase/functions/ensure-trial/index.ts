import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const authHeader = req.headers.get("Authorization") || ""
    if (!authHeader) {
      return Response.json({ error: "Não autenticado." }, { status: 401, headers: corsHeaders })
    }

    const url = Deno.env.get("SUPABASE_URL")!
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return Response.json({ error: "Não autenticado." }, { status: 401, headers: corsHeaders })
    }

    const admin = createClient(url, serviceRole)
    const { data: existing, error: existingError } = await admin
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()

    if (existingError) throw existingError
    if (existing) return Response.json(existing, { headers: corsHeaders })

    const now = new Date()
    const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const { data, error } = await admin
      .from("subscriptions")
      .insert({
        user_id: user.id,
        plan: "trial",
        status: "trialing",
        active: true,
        trial_start: now.toISOString(),
        trial_end: trialEnd.toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return Response.json(data, { headers: corsHeaders })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Erro ao iniciar trial." },
      { status: 500, headers: corsHeaders }
    )
  }
})
