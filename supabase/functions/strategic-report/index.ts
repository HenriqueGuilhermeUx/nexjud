import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireUser } from "../_shared/requireUser.ts";

// Código trazido da produção (versão 8) em 2026-11-25 e protegido com login.
// Gasta: OpenAI (gpt-4.1-mini, até 2600 tokens de saída por chamada).

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

    const title = String(body.title || "Relatório Estratégico NexJud").trim();
    const context = String(body.context || "").trim();
    const module = String(body.module || "premium-report").trim();

    if (!context) {
      return Response.json(
        { error: "Envie o contexto da análise para gerar o relatório." },
        { status: 400, headers: corsHeaders },
      );
    }

    const prompt = `
Você é o NexJud, uma inteligência jurídica estratégica para advogados brasileiros.

Gere um relatório executivo premium a partir do contexto abaixo.

Regras:
- Não prometa resultado.
- Não invente jurisprudência específica.
- Use linguagem profissional, objetiva e estratégica.
- O relatório deve ajudar o advogado a decidir: protocolar, reforçar provas, negociar, recorrer ou evitar risco.
- Devolva SOMENTE JSON válido, sem markdown.

Schema obrigatório:
{
  "title": "string",
  "module": "string",
  "generatedAt": "string ISO",
  "executiveSummary": "string",
  "strategicScore": number,
  "sections": [
    {
      "title": "string",
      "items": ["string", "string", "string"]
    }
  ],
  "conclusion": "string"
}

Título:
${title}

Módulo de origem:
${module}

Contexto:
${context}
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
        max_output_tokens: 2600,
      }),
    });

    if (!openAiResponse.ok) {
      console.error("strategic-report OpenAI error", openAiResponse.status, await openAiResponse.text());
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
      const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
      result = JSON.parse(cleaned);
    }

    result.title = result.title || title;
    result.module = result.module || module;
    result.generatedAt = result.generatedAt || new Date().toISOString();

    return Response.json(result, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro ao gerar relatório estratégico.",
      },
      { status: 500, headers: corsHeaders },
    );
  }
});
