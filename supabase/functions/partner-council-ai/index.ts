import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function fallback() {
  return {
    title: "Partner Council AI",
    finalVote: "ACEITAR COM CAUTELA",
    riskLevel: "MÉDIO",
    summary:
      "O conselho recomenda avançar somente com prova documental suficiente, estratégia de acordo definida e controle de risco econômico.",
    recommendedPosition:
      "Aceitar o caso com estratégia de prova e tentativa inicial de composição.",
    conservativePartner: {
      decision: "ACEITAR COM CAUTELA",
      reason: "Exige documentação robusta e controle de risco.",
      concerns: ["Prova insuficiente", "Sucumbência", "Dano não comprovado"],
    },
    aggressivePartner: {
      decision: "ACEITAR",
      reason: "Há possibilidade de pressão estratégica e ganho relevante.",
      strategy: ["Pedido forte", "Tutela se cabível", "Negociação após contestação"],
    },
    strategicPartner: {
      decision: "NEGOCIAR COM FORÇA",
      reason: "Melhor caminho pode ser gerar valor rápido com acordo bem posicionado.",
      nextMoves: ["Organizar provas", "Quantificar dano", "Definir piso de acordo"],
    },
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const { caseText } = await req.json()
    const text = String(caseText || "").trim()

    if (!text) {
      return Response.json({ error: "caseText obrigatório." }, { status: 400, headers: corsHeaders })
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")
    if (!OPENAI_API_KEY) return Response.json(fallback(), { headers: corsHeaders })

    const prompt = `
Você é um conselho de 3 sócios jurídicos: conservador, agressivo e estratégico.
Analise o caso e retorne SOMENTE JSON válido.

Caso:
${text}

JSON:
{
  "title": "string",
  "finalVote": "string",
  "riskLevel": "BAIXO|MÉDIO|ALTO",
  "summary": "string",
  "recommendedPosition": "string",
  "conservativePartner": {"decision":"string","reason":"string","concerns":["string"]},
  "aggressivePartner": {"decision":"string","reason":"string","strategy":["string"]},
  "strategicPartner": {"decision":"string","reason":"string","nextMoves":["string"]}
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
      { error: error instanceof Error ? error.message : "Erro partner-council-ai" },
      { status: 500, headers: corsHeaders }
    )
  }
})
