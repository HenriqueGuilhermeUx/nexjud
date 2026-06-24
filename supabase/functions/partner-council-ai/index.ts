import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function safeObject(value: any) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {}
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
    const caseText = String(body.caseText || "").trim()

    if (!caseText) {
      return Response.json(
        { error: "Texto do caso é obrigatório." },
        { status: 400, headers: corsHeaders }
      )
    }

    const prompt = `
Você é o NexJud AI Partner Council™, um conselho de 3 sócios jurídicos estratégicos para advogados brasileiros.

Analise o caso abaixo como se fosse uma reunião interna de sócios.

NÃO dê aconselhamento jurídico definitivo.
NÃO invente jurisprudência específica.
NÃO cite números de processos inexistentes.
Trabalhe apenas com o texto fornecido.

CASO:
${caseText}

Responda SOMENTE JSON válido, sem markdown.

Formato obrigatório:
{
  "title": "título curto",
  "conservativePartner": {
    "decision": "ACEITARIA | RECUSARIA | ACEITARIA COM CAUTELA | NEGOCIARIA ACORDO",
    "reason": "motivo objetivo",
    "concerns": ["preocupação 1", "preocupação 2", "preocupação 3"],
    "conditions": ["condição 1", "condição 2", "condição 3"]
  },
  "aggressivePartner": {
    "decision": "ACEITARIA | RECUSARIA | ACEITARIA COM CAUTELA | NEGOCIARIA ACORDO",
    "reason": "motivo objetivo",
    "strategy": ["estratégia 1", "estratégia 2", "estratégia 3"],
    "pressurePoints": ["ponto de pressão 1", "ponto de pressão 2", "ponto de pressão 3"]
  },
  "strategicPartner": {
    "decision": "ACEITARIA | RECUSARIA | ACEITARIA COM CAUTELA | NEGOCIARIA ACORDO",
    "reason": "motivo objetivo",
    "nextMoves": ["próximo movimento 1", "próximo movimento 2", "próximo movimento 3"],
    "businessView": "visão comercial/econômica do caso"
  },
  "finalVote": "decisão final consolidada",
  "executiveSummary": "resumo executivo em até 5 linhas",
  "recommendedPosition": "posição recomendada para o advogado",
  "riskLevel": "BAIXO | MÉDIO | ALTO | CRÍTICO"
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
        temperature: 0.2,
        max_output_tokens: 2200,
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

    const normalized = {
      title: parsed.title || "AI Partner Council NexJud",
      conservativePartner: safeObject(parsed.conservativePartner),
      aggressivePartner: safeObject(parsed.aggressivePartner),
      strategicPartner: safeObject(parsed.strategicPartner),
      finalVote: parsed.finalVote || "ACEITARIA COM CAUTELA",
      executiveSummary: parsed.executiveSummary || "",
      recommendedPosition: parsed.recommendedPosition || "",
      riskLevel: parsed.riskLevel || "MÉDIO",
    }

    return Response.json(normalized, { headers: corsHeaders })
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno no Partner Council AI.",
      },
      { status: 500, headers: corsHeaders }
    )
  }
})
