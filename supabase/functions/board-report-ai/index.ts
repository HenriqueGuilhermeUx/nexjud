import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { requireUser } from "../_shared/requireUser.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function fallback() {
  return {
    title: "Board Report AI",
    decision: "AVALIAR COM CAUTELA",
    riskLevel: "MÉDIO",
    financialImpact: "A estimar",
    executiveSummary:
      "Relatório executivo preliminar: o caso exige validação documental, análise de risco e estratégia de negociação antes de decisão final.",
    partnerBriefing:
      "Recomenda-se seguir com análise, organizar provas e definir régua de acordo.",
    recommendedActions: [
      "Validar documentos.",
      "Quantificar exposição financeira.",
      "Definir decisão de entrada.",
      "Preparar minuta ou proposta.",
    ],
    criticalAlerts: [
      "Atenção à prova do dano.",
      "Atenção à prescrição.",
      "Atenção ao custo de continuidade.",
    ],
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  const auth = await requireUser(req, corsHeaders)
  if (!auth.ok) return auth.response

  try {
    const body = await req.json().catch(() => ({}))

    const context = [
      body.portfolioContext,
      body.tribunalContext,
      body.opponentContext,
      body.clientRiskContext,
      body.caseText,
    ]
      .filter(Boolean)
      .join("\n\n")

    if (!context.trim()) {
      return Response.json({ error: "contexto obrigatório." }, { status: 400, headers: corsHeaders })
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")
    if (!OPENAI_API_KEY) return Response.json(fallback(), { headers: corsHeaders })

    const prompt = `
Você é um sócio gestor de escritório de advocacia.
Gere relatório executivo para decisão de negócio.
Retorne SOMENTE JSON válido.

Contexto:
${context}

JSON:
{
  "title": "string",
  "decision": "string",
  "riskLevel": "BAIXO|MÉDIO|ALTO",
  "financialImpact": "string",
  "executiveSummary": "string",
  "partnerBriefing": "string",
  "recommendedActions": ["string"],
  "criticalAlerts": ["string"]
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
        temperature: 0.2,
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
      { error: error instanceof Error ? error.message : "Erro board-report-ai" },
      { status: 500, headers: corsHeaders }
    )
  }
})
