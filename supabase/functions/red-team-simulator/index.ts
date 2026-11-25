import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireUser } from "../_shared/requireUser.ts";

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

  const auth = await requireUser(req, corsHeaders);
  if (!auth.ok) return auth.response;

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
    const userMessage = String(body.userMessage || "").trim();
    const role = String(body.role || "advogado_adversario");
    const history = Array.isArray(body.history) ? body.history : [];

    if (!caseText) {
      return Response.json(
        { error: "Texto do caso é obrigatório." },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!userMessage) {
      return Response.json(
        { error: "Mensagem do usuário é obrigatória." },
        { status: 400, headers: corsHeaders }
      );
    }

    const roleLabel =
      role === "juiz"
        ? "Juiz"
        : role === "promotor"
        ? "Promotor"
        : role === "procurador_fazenda"
        ? "Procurador da Fazenda Nacional"
        : "Advogado da parte contrária";

    const prompt = `
Você é o Red Team Simulator™ do NexJud.

Você deve assumir o papel de: ${roleLabel}.

Objetivo:
Treinar o advogado usuário para audiência, sustentação oral, negociação ou contestação.

Regras:
- Seja firme, técnico e incisivo.
- Faça perguntas difíceis.
- Ataque os pontos fracos da tese.
- Não seja ofensivo.
- Não dê resposta longa demais.
- A cada resposta, faça no máximo 2 perguntas.
- Sempre finalize com uma pressão estratégica.
- Responda em português jurídico claro.

Caso analisado:
${caseText}

Histórico da simulação:
${JSON.stringify(history).slice(0, 6000)}

Mensagem atual do advogado:
${userMessage}

Responda SOMENTE JSON válido:
{
  "role": "${roleLabel}",
  "reply": "resposta simulada no papel escolhido",
  "pressureLevel": "Baixo | Médio | Alto",
  "weakPointDetected": "principal ponto fraco identificado",
  "suggestedImprovement": "como o advogado pode melhorar a resposta",
  "score": 0
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
        max_output_tokens: 1200,
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
            : "Erro interno no Red Team Simulator.",
      },
      { status: 500, headers: corsHeaders }
    );
  }
});
