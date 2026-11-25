import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { requireUser } from "../_shared/requireUser.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function fallback() {
  return {
    title: "War Room AI",
    riskLevel: "MÉDIO",
    attackPlan: [
      "Questionar prova documental.",
      "Alegar ausência de dano comprovado.",
      "Sustentar regularidade da conduta.",
    ],
    defensePlan: [
      "Organizar linha do tempo documental.",
      "Destacar protocolos e comunicações.",
      "Quantificar prejuízo de forma objetiva.",
    ],
    negotiationPlan: [
      "Definir valor mínimo de acordo.",
      "Usar prova documental como pressão.",
      "Negociar antes de audiência ou perícia.",
    ],
    emergencyActions: [
      "Reunir documentos essenciais.",
      "Validar prescrição.",
      "Mapear risco financeiro.",
    ],
    nextMoves: [
      "Criar tese principal.",
      "Preparar minuta.",
      "Definir estratégia de acordo.",
    ],
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  const auth = await requireUser(req, corsHeaders)
  if (!auth.ok) return auth.response

  try {
    const { caseText } = await req.json()
    const text = String(caseText || "").trim()

    if (!text) {
      return Response.json({ error: "caseText obrigatório." }, { status: 400, headers: corsHeaders })
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")
    if (!OPENAI_API_KEY) return Response.json(fallback(), { headers: corsHeaders })

    const prompt = `
Você é um War Room jurídico.
Crie ataque, defesa, negociação e ações urgentes.
Retorne SOMENTE JSON válido.

Caso:
${text}

JSON:
{
  "title": "string",
  "riskLevel": "BAIXO|MÉDIO|ALTO",
  "attackPlan": ["string"],
  "defensePlan": ["string"],
  "negotiationPlan": ["string"],
  "emergencyActions": ["string"],
  "nextMoves": ["string"]
}
`

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.25,
        messages: [
          { role: "system", content: "Responda apenas JSON válido." },
          { role: "user", content: prompt },
        ],
      }),
    })

    const json = await response.json()
    const content = json?.choices?.[0]?.message?.content || ""

    try {
      return Response.json(JSON.parse(content), { headers: corsHeaders })
    } catch {
      return Response.json({ ...fallback(), raw: content }, { headers: corsHeaders })
    }
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Erro war-room-ai" },
      { status: 500, headers: corsHeaders }
    )
  }
})
