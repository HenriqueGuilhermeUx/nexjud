import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function arr(v: any) {
  return Array.isArray(v) ? v : []
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")
    if (!OPENAI_API_KEY) {
      return Response.json({ error: "OPENAI_API_KEY não configurada." }, { status: 500, headers: corsHeaders })
    }

    const body = await req.json().catch(() => ({}))
    const caseText = String(body.caseText || "").trim()

    if (!caseText) {
      return Response.json({ error: "Texto do caso é obrigatório." }, { status: 400, headers: corsHeaders })
    }

    const prompt = `
Você é o NexJud Litigation Strategy AI™, uma IA estratégica para advogados brasileiros.

Monte um plano jurídico executável com base no caso abaixo.

NÃO invente jurisprudência, números de processos ou leis específicas se não estiverem no texto.
NÃO dê aconselhamento jurídico definitivo.
Responda SOMENTE JSON válido.

CASO:
${caseText}

Formato:
{
  "title": "título curto",
  "diagnosis": "diagnóstico estratégico",
  "successProbability": 0,
  "riskLevel": "BAIXO | MÉDIO | ALTO | CRÍTICO",
  "planA": {
    "name": "Plano A",
    "objective": "objetivo",
    "actions": ["ação 1", "ação 2", "ação 3"]
  },
  "planB": {
    "name": "Plano B",
    "objective": "objetivo",
    "actions": ["ação 1", "ação 2", "ação 3"]
  },
  "planC": {
    "name": "Plano C",
    "objective": "objetivo",
    "actions": ["ação 1", "ação 2", "ação 3"]
  },
  "evidence": ["prova 1", "prova 2", "prova 3"],
  "witnesses": ["testemunha/perfil 1", "testemunha/perfil 2"],
  "claims": ["pedido 1", "pedido 2", "pedido 3"],
  "timeline": [
    {"step": "etapa", "deadline": "prazo sugerido", "action": "ação"}
  ],
  "checklist": ["item 1", "item 2", "item 3"],
  "weakPoints": ["fragilidade 1", "fragilidade 2"],
  "strongPoints": ["força 1", "força 2"],
  "nextMove": "próximo movimento recomendado",
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
        max_output_tokens: 2600,
      }),
    })

    const json = await ai.json()
    const text = json.output_text || json.output?.[0]?.content?.[0]?.text || ""

    if (!text) {
      return Response.json({ error: "OpenAI não retornou texto.", raw: json }, { status: 500, headers: corsHeaders })
    }

    const parsed = JSON.parse(text.replace(/```json/g, "").replace(/```/g, "").trim())

    return Response.json({
      title: parsed.title || "Litigation Strategy NexJud",
      diagnosis: parsed.diagnosis || "",
      successProbability: Number(parsed.successProbability || 0),
      riskLevel: parsed.riskLevel || "MÉDIO",
      planA: parsed.planA || {},
      planB: parsed.planB || {},
      planC: parsed.planC || {},
      evidence: arr(parsed.evidence),
      witnesses: arr(parsed.witnesses),
      claims: arr(parsed.claims),
      timeline: arr(parsed.timeline),
      checklist: arr(parsed.checklist),
      weakPoints: arr(parsed.weakPoints),
      strongPoints: arr(parsed.strongPoints),
      nextMove: parsed.nextMove || "",
      executiveSummary: parsed.executiveSummary || "",
    }, { headers: corsHeaders })
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Erro interno no Litigation Strategy AI." },
      { status: 500, headers: corsHeaders }
    )
  }
})
