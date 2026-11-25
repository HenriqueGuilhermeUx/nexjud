import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { requireUser } from "../_shared/requireUser.ts"

// Código trazido da produção (versão 7) em 2026-11-25 e protegido com login.
// Gasta: OpenAI embeddings (text-embedding-3-small). Sem login, funcionava
// como um proxy gratuito de embeddings para qualquer pessoa na internet.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  const auth = await requireUser(req, corsHeaders)
  if (!auth.ok) return auth.response

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY ausente.")

    const body = await req.json().catch(() => ({}))
    const text = String(body.text || "").trim()

    if (!text) throw new Error("Texto obrigatório para embedding.")

    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text.slice(0, 8000),
      }),
    })

    const json = await response.json().catch(() => ({}))

    if (!response.ok) {
      console.error("generate-embedding OpenAI error", response.status, JSON.stringify(json))
      return Response.json(
        { error: "Erro OpenAI Embedding" },
        { status: 400, headers: corsHeaders }
      )
    }

    return Response.json(
      { embedding: json.data?.[0]?.embedding || [] },
      { headers: corsHeaders }
    )
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Erro generate-embedding." },
      { status: 500, headers: corsHeaders }
    )
  }
})
