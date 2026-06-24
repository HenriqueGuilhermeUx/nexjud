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
    const caseText = String(body.caseText || "").trim()
    const actionType = String(body.actionType || "strategy").trim()
    const actionTitle = String(body.actionTitle || "Estratégia Completa").trim()

    if (!caseText) {
      return Response.json(
        { error: "Texto do caso é obrigatório." },
        { status: 400, headers: corsHeaders }
      )
    }

    const prompt = `
Você é o NexJud One-Click Actions™, uma IA jurídica estratégica para advogados brasileiros.

Sua tarefa é gerar uma entrega prática conforme a ação solicitada.

Ação solicitada:
${actionTitle}

Tipo interno:
${actionType}

Caso:
${caseText}

NÃO dê aconselhamento jurídico definitivo.
NÃO invente jurisprudência, leis, súmulas ou números de processos.
NÃO cite fundamento específico se ele não estiver claro no caso.
Use linguagem profissional, estratégica e aproveitável pelo advogado.

Responda SOMENTE JSON válido, sem markdown.

Formato obrigatório:
{
  "title": "título da entrega",
  "actionType": "${actionType}",
  "objective": "objetivo estratégico da entrega",
  "recommendedUse": "como o advogado deve usar essa entrega",
  "document": {
    "opening": "abertura ou introdução da peça/ação",
    "sections": [
      {
        "title": "título da seção",
        "content": "conteúdo desenvolvido"
      }
    ],
    "closing": "fechamento ou pedido/encaminhamento"
  },
  "strategicNotes": [
    "nota estratégica 1",
    "nota estratégica 2",
    "nota estratégica 3"
  ],
  "risks": [
    "risco 1",
    "risco 2",
    "risco 3"
  ],
  "nextSteps": [
    "próximo passo 1",
    "próximo passo 2",
    "próximo passo 3"
  ]
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
        max_output_tokens: 2600,
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
      title: parsed.title || actionTitle,
      actionType,
      objective: parsed.objective || "",
      recommendedUse: parsed.recommendedUse || "",
      document: {
        opening: parsed.document?.opening || "",
        sections: safeArray(parsed.document?.sections),
        closing: parsed.document?.closing || "",
      },
      strategicNotes: safeArray(parsed.strategicNotes),
      risks: safeArray(parsed.risks),
      nextSteps: safeArray(parsed.nextSteps),
    }

    return Response.json(normalized, { headers: corsHeaders })
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno no One-Click AI.",
      },
      { status: 500, headers: corsHeaders }
    )
  }
})
