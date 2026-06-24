import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function safeArray(value: any, fallback: string[] = []) {
  return Array.isArray(value) ? value : fallback
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
Você é o NexJud Litigation War Room™, uma IA estratégica para advogados brasileiros.

Analise o caso abaixo e produza uma central tática de litígio.

NÃO dê aconselhamento jurídico definitivo.
NÃO invente jurisprudência específica.
NÃO cite números de processos inexistentes.
Trabalhe apenas com o texto fornecido.

CASO:
${caseText}

Responda SOMENTE JSON válido, sem markdown, sem texto fora do JSON.

Formato obrigatório:
{
  "title": "título curto e específico",
  "risks": [
    "risco crítico 1 específico",
    "risco crítico 2 específico",
    "risco crítico 3 específico",
    "risco crítico 4 específico"
  ],
  "opportunities": [
    "oportunidade estratégica 1",
    "oportunidade estratégica 2",
    "oportunidade estratégica 3",
    "oportunidade estratégica 4"
  ],
  "missingEvidence": [
    "prova faltante 1",
    "prova faltante 2",
    "prova faltante 3",
    "prova faltante 4"
  ],
  "opponentArguments": [
    "argumento provável do adversário 1",
    "argumento provável do adversário 2",
    "argumento provável do adversário 3",
    "argumento provável do adversário 4"
  ],
  "nextMoves": [
    "próximo movimento prático 1",
    "próximo movimento prático 2",
    "próximo movimento prático 3",
    "próximo movimento prático 4",
    "próximo movimento prático 5"
  ],
  "hearingStrategy": [
    "estratégia de audiência 1",
    "estratégia de audiência 2",
    "estratégia de audiência 3"
  ],
  "settlementStrategy": "estratégia objetiva de acordo",
  "priority": "BAIXA | MÉDIA | ALTA | CRÍTICA",
  "executiveSummary": "resumo executivo em até 5 linhas"
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
      title: parsed.title || "War Room NexJud",
      risks: safeArray(parsed.risks),
      opportunities: safeArray(parsed.opportunities),
      missingEvidence: safeArray(parsed.missingEvidence),
      opponentArguments: safeArray(parsed.opponentArguments),
      nextMoves: safeArray(parsed.nextMoves),
      hearingStrategy: safeArray(parsed.hearingStrategy),
      settlementStrategy: parsed.settlementStrategy || "",
      priority: parsed.priority || "MÉDIA",
      executiveSummary: parsed.executiveSummary || "",
    }

    return Response.json(normalized, { headers: corsHeaders })
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno no War Room AI.",
      },
      { status: 500, headers: corsHeaders }
    )
  }
})
