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

    const portfolioContext = String(body.portfolioContext || "").trim()
    const tribunalContext = String(body.tribunalContext || "").trim()
    const opponentContext = String(body.opponentContext || "").trim()
    const clientRiskContext = String(body.clientRiskContext || "").trim()

    const prompt = `
Você é o NexJud Board Report AI™, uma IA executiva para escritórios de advocacia, departamentos jurídicos e sócios.

Sua tarefa é transformar dados da carteira jurídica em um relatório executivo objetivo, comercial e estratégico.

Contexto da carteira:
${portfolioContext || "Sem dados detalhados de carteira."}

Contexto Tribunal DNA:
${tribunalContext || "Não informado."}

Contexto Opponent Intelligence:
${opponentContext || "Não informado."}

Contexto Client Risk:
${clientRiskContext || "Não informado."}

NÃO invente números.
NÃO invente processos.
NÃO cite fontes externas não fornecidas.
Se os dados forem limitados, indique que a leitura é preliminar.

Responda SOMENTE JSON válido, sem markdown.

Formato obrigatório:
{
  "title": "título executivo",
  "decision": "AÇÃO IMEDIATA | MONITORAR | NEGOCIAR | REFORÇAR PROVAS | SEM DADOS",
  "riskLevel": "BAIXO | MÉDIO | ALTO | CRÍTICO",
  "executiveSummary": "resumo executivo em até 6 linhas",
  "financialImpact": "impacto financeiro textual",
  "portfolioDiagnosis": [
    "diagnóstico 1",
    "diagnóstico 2",
    "diagnóstico 3"
  ],
  "criticalAlerts": [
    "alerta crítico 1",
    "alerta crítico 2",
    "alerta crítico 3"
  ],
  "recommendedActions": [
    "ação recomendada 1",
    "ação recomendada 2",
    "ação recomendada 3",
    "ação recomendada 4"
  ],
  "partnerBriefing": "texto curto para sócios",
  "clientBriefing": "texto curto para cliente corporativo",
  "nextBoardAgenda": [
    "pauta 1",
    "pauta 2",
    "pauta 3"
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
        title: parsed.title || "NexJud Board Report AI",
        decision: parsed.decision || "MONITORAR",
        riskLevel: parsed.riskLevel || "MÉDIO",
        executiveSummary: parsed.executiveSummary || "",
        financialImpact: parsed.financialImpact || "",
        portfolioDiagnosis: safeArray(parsed.portfolioDiagnosis),
        criticalAlerts: safeArray(parsed.criticalAlerts),
        recommendedActions: safeArray(parsed.recommendedActions),
        partnerBriefing: parsed.partnerBriefing || "",
        clientBriefing: parsed.clientBriefing || "",
        nextBoardAgenda: safeArray(parsed.nextBoardAgenda),
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
            : "Erro interno no Board Report AI.",
      },
      { status: 500, headers: corsHeaders }
    )
  }
})
