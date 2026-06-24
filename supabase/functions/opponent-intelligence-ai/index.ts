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
    const opponentName = String(body.opponentName || "").trim()
    const processContext = String(body.processContext || "").trim()

    if (!opponentName) {
      return Response.json(
        { error: "Nome do adversário é obrigatório." },
        { status: 400, headers: corsHeaders }
      )
    }

    const prompt = `
Você é o NexJud Opponent Intelligence™, uma IA estratégica para advogados brasileiros.

Analise o adversário abaixo com base no nome e no contexto processual disponível.

Adversário:
${opponentName}

Contexto processual disponível:
${processContext || "Sem contexto processual detalhado."}

NÃO invente dados externos.
NÃO diga que consultou bases externas se isso não foi fornecido.
NÃO invente processos, jurisprudência ou estatísticas reais.
Se não houver dados suficientes, deixe claro que é leitura estratégica preliminar.

Responda SOMENTE JSON válido, sem markdown.

Formato obrigatório:
{
  "opponentName": "nome analisado",
  "profile": "perfil estratégico do adversário",
  "aggressivenessLevel": "BAIXO | MÉDIO | ALTO | CRÍTICO",
  "settlementTrend": "BAIXA | MÉDIA | ALTA | INCONCLUSIVA",
  "appealTrend": "BAIXA | MÉDIA | ALTA | INCONCLUSIVA",
  "defensePattern": [
    "padrão provável de defesa 1",
    "padrão provável de defesa 2",
    "padrão provável de defesa 3"
  ],
  "pressurePoints": [
    "ponto de pressão 1",
    "ponto de pressão 2",
    "ponto de pressão 3"
  ],
  "weaknesses": [
    "fraqueza potencial 1",
    "fraqueza potencial 2",
    "fraqueza potencial 3"
  ],
  "negotiationStrategy": [
    "estratégia de negociação 1",
    "estratégia de negociação 2",
    "estratégia de negociação 3"
  ],
  "litigationStrategy": [
    "estratégia de litígio 1",
    "estratégia de litígio 2",
    "estratégia de litígio 3"
  ],
  "recommendedApproach": "abordagem objetiva recomendada",
  "executiveSummary": "resumo executivo em até 5 linhas",
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

    return Response.json(
      {
        opponentName: parsed.opponentName || opponentName,
        profile: parsed.profile || "Perfil inconclusivo.",
        aggressivenessLevel: parsed.aggressivenessLevel || "MÉDIO",
        settlementTrend: parsed.settlementTrend || "INCONCLUSIVA",
        appealTrend: parsed.appealTrend || "INCONCLUSIVA",
        defensePattern: safeArray(parsed.defensePattern),
        pressurePoints: safeArray(parsed.pressurePoints),
        weaknesses: safeArray(parsed.weaknesses),
        negotiationStrategy: safeArray(parsed.negotiationStrategy),
        litigationStrategy: safeArray(parsed.litigationStrategy),
        recommendedApproach: parsed.recommendedApproach || "",
        executiveSummary: parsed.executiveSummary || "",
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
            : "Erro interno no Opponent Intelligence AI.",
      },
      { status: 500, headers: corsHeaders }
    )
  }
})
