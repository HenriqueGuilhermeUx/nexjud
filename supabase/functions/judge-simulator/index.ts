import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Espelho da produção (versão 8), copiado em 2026-11-25. Sem mudanças de lógica.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      return Response.json(
        { error: "OPENAI_API_KEY não configurada." },
        { status: 500, headers: corsHeaders }
      );
    }

    const body = await req.json().catch(() => ({}));

    const caseText = String(body.caseText || "").trim();
    const userArgument = String(body.userArgument || "").trim();
    const hearingType = String(body.hearingType || "audiencia");
    const difficulty = String(body.difficulty || "alta");
    const history = Array.isArray(body.history) ? body.history : [];

    if (!caseText) {
      return Response.json(
        { error: "Texto do caso é obrigatório." },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!userArgument) {
      return Response.json(
        { error: "Argumento do advogado é obrigatório." },
        { status: 400, headers: corsHeaders }
      );
    }

    const prompt = `
Você é o Judge Simulator™ do NexJud.

Você assume o papel de um juiz brasileiro em uma simulação de audiência, sustentação oral ou julgamento.

Tipo de ato:
${hearingType}

Nível de dificuldade:
${difficulty}

Caso:
${caseText}

Histórico:
${JSON.stringify(history).slice(0, 6000)}

Argumento atual do advogado:
${userArgument}

Regras:
- Aja como juiz exigente, técnico e objetivo.
- Faça perguntas difíceis.
- Pode interromper educadamente.
- Peça fundamento jurídico, prova ou nexo causal.
- Aponte inconsistências.
- Não seja ofensivo.
- Não invente jurisprudência.
- Faça no máximo 3 perguntas por rodada.
- Dê nota da sustentação de 0 a 100.
- Dê uma sugestão prática de melhoria.

Responda SOMENTE JSON válido:

{
  "judgeReply": "fala do juiz simulada",
  "interruptions": ["interrupção ou objeção 1", "interrupção ou objeção 2"],
  "hardQuestions": ["pergunta difícil 1", "pergunta difícil 2", "pergunta difícil 3"],
  "detectedWeakness": "principal inconsistência ou fragilidade detectada",
  "requestedFoundation": "qual fundamento/prova o juiz exigiria",
  "performanceScore": 0,
  "improvementAdvice": "orientação objetiva para melhorar a sustentação",
  "nextChallenge": "próxima provocação do juiz"
}
`;

    const ai = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt,
        temperature: 0.25,
        max_output_tokens: 1600,
      }),
    });

    const json = await ai.json();

    const text =
      json.output_text ||
      json.output?.[0]?.content?.[0]?.text ||
      "";

    if (!text) {
      return Response.json(
        { error: "OpenAI não retornou texto.", raw: json },
        { status: 500, headers: corsHeaders }
      );
    }

    const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(clean);

    return Response.json(parsed, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno no Judge Simulator.",
      },
      { status: 500, headers: corsHeaders }
    );
  }
});
