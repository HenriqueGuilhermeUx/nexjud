import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function safeArray(value: any) {
  return Array.isArray(value) ? value : []
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")

    if (!OPENAI_API_KEY) {
      return Response.json(
        { error: "OPENAI_API_KEY não configurada." },
        { status: 500, headers: corsHeaders }
      )
    }

    const body = await req.json().catch(() => ({}))
    const tribunalContext = String(body.tribunalContext || "").trim()

    const prompt = `
Você é o NexJud Tribunal Heatmap AI™, uma IA estratégica para análise de tribunais brasileiros.

Analise os dados abaixo e gere um heatmap executivo por tribunal.

Dados disponíveis:
${tribunalContext || "Sem dados detalhados."}

NÃO invente dados externos.
NÃO diga que consultou bases externas.
Use apenas os dados fornecidos.
Se a base for pequena, indique confiança baixa.

Responda SOMENTE JSON válido, sem markdown.

Formato obrigatório:
{
  "overview": "resumo executivo do mapa de tribunais",
  "tribunals": [
    {
      "tribunal": "nome do tribunal",
      "riskLevel": "BAIXO | MÉDIO | ALTO | CRÍTICO",
      "efficiencyScore": 0,
      "complexityScore": 0,
      "movementIntensity": "BAIXA | MÉDIA | ALTA",
      "profile": "perfil estratégico do tribunal",
      "strategicAdvice": "orientação prática"
    }
  ],
  "alerts": [
    "alerta 1",
    "alerta 2",
    "alerta 3"
  ],
  "recommendedActions": [
    "ação 1",
    "ação 2",
    "ação 3"
  ],
  "confidenceLevel": "BAIXO | MÉDIO | ALTO"
}
`

    const ai = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt,
        temperature: 0.18,
        max_output_tokens: 2400,
      }),
    })

    const json = await ai.json()

    const text =
      json.output_text ||
      json.output?.[0]?.content?.[0]?.text ||
      ""

    if (!text) {
      return Response.json(
        { error: "OpenAI não retornou texto.", raw: json },
        { status: 500, headers: corsHeaders }
      )
    }

    const clean = text.replace(/```json/g, "").replace(/```/g, "").trim()
    const parsed = JSON.parse(clean)

    return Response.json(
      {
        overview: parsed.overview || "",
        tribunals: safeArray(parsed.tribunals),
        alerts: safeArray(parsed.alerts),
        recommendedActions: safeArray(parsed.recommendedActions),
        confidenceLevel: parsed.confidenceLevel || "MÉDIO",
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno no Tribunal Heatmap AI.",
      },
      { status: 500, headers: corsHeaders }
    )
  }
})
