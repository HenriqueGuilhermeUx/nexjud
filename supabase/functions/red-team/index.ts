import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireUser } from "../_shared/requireUser.ts";

// Código trazido da produção (versão 8) em 2026-11-25 e protegido com login.
// Gasta: OpenAI (gpt-4.1-mini, até 2400 tokens de saída por chamada).

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
        { error: "OPENAI_API_KEY não configurada no Supabase Secrets." },
        { status: 500, headers: corsHeaders },
      );
    }

    const body = await req.json().catch(() => ({}));

    const strategy = String(body.strategy || "").trim();
    const caseType = String(body.caseType || "CÍVEL").trim();

    if (!strategy) {
      return Response.json(
        { error: "Cole sua tese, petição ou estratégia." },
        { status: 400, headers: corsHeaders },
      );
    }

    const prompt = `
Você é o NexJud Red Team Jurídico.

Sua função é simular a parte contrária, o juiz crítico e um advogado adversário experiente.

Analise a tese abaixo e devolva SOMENTE um JSON válido, sem markdown, sem texto antes ou depois.

Regras:
- Não invente jurisprudência específica.
- Não prometa resultado.
- Seja técnico, direto e útil para advogado brasileiro.
- Aponte vulnerabilidades reais.
- Dê sugestões práticas de blindagem.
- riskScore deve ir de 0 a 100, onde 100 significa tese muito vulnerável.
- riskLevel deve ser "BAIXO", "MÉDIO" ou "ALTO".

Schema obrigatório:
{
  "caseType": "string",
  "riskScore": number,
  "riskLevel": "BAIXO" | "MÉDIO" | "ALTO",
  "attacks": ["string", "string", "string", "string"],
  "weakPoints": ["string", "string", "string"],
  "missingProofs": ["string", "string", "string", "string"],
  "judgeQuestions": ["string", "string", "string", "string"],
  "howToFix": ["string", "string", "string", "string", "string"],
  "strengthenedStrategy": "string"
}

Tipo de caso:
${caseType}

Tese, petição ou estratégia:
${strategy}
`;

    const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt,
        temperature: 0.2,
        max_output_tokens: 2400,
      }),
    });

    if (!openAiResponse.ok) {
      console.error("red-team OpenAI error", openAiResponse.status, await openAiResponse.text());
      return Response.json(
        { error: "Erro na OpenAI" },
        { status: 500, headers: corsHeaders },
      );
    }

    const openAiData = await openAiResponse.json();

    const text =
      openAiData.output_text ||
      openAiData.output?.[0]?.content?.[0]?.text ||
      "";

    if (!text) {
      return Response.json(
        { error: "OpenAI não retornou texto." },
        { status: 500, headers: corsHeaders },
      );
    }

    let result;

    try {
      result = JSON.parse(text);
    } catch (_error) {
      const cleaned = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      result = JSON.parse(cleaned);
    }

    result.caseType = result.caseType || caseType;

    return Response.json(result, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Erro interno no Red Team.",
      },
      { status: 500, headers: corsHeaders },
    );
  }
});
