import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireUser } from "../_shared/requireUser.ts";

// Código trazido da produção (versão 9) em 2026-11-25 e protegido com login.
// Gasta: OpenAI (gpt-4.1-mini, até 2400 tokens de saída por chamada).
// Chamada por src/lib/api.ts (performJurisprudenceSearch), que hoje não tem
// nenhuma tela usando. Candidata a desligamento na limpeza de módulos.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Court = "STF" | "STJ" | "TRF1" | "TRF2" | "TRF3" | "TRF4";
type Period = "1year" | "3years" | "5years" | "all";

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

    const theme = String(body.theme || "").trim();
    const court = String(body.court || "STJ").trim().toUpperCase() as Court;
    const period = String(body.period || "5years").trim() as Period;
    const camara = String(body.camara || "").trim();
    const materia = String(body.materia || "").trim();

    if (!theme) {
      return Response.json(
        { error: "Informe o tema da pesquisa jurisprudencial." },
        { status: 400, headers: corsHeaders },
      );
    }

    const prompt = `
Você é o NexJud, uma inteligência de jurisprudência estratégica para advogados brasileiros.

Analise o tema jurídico abaixo e gere uma leitura estratégica.

Regras:
- Não invente números reais de decisões.
- Não invente jurisprudência específica, número de processo, relator ou data.
- Pode falar em "tendência estratégica" e "padrões argumentativos prováveis".
- Use linguagem técnica, útil e prática.
- Devolva SOMENTE JSON válido, sem markdown.

Schema obrigatório:
{
  "theme": "string",
  "decisionsCount": number,
  "analysis": "string",
  "trend": "FAVORÁVEL" | "DESFAVORÁVEL" | "NEUTRO",
  "successRate": number,
  "heatmap": {
    "zonaVerde": ["string", "string", "string"],
    "zonaAmarela": ["string", "string", "string"],
    "zonaVermelha": ["string", "string", "string"]
  },
  "recommendations": ["string", "string", "string", "string", "string"]
}

Tema:
${theme}

Tribunal:
${court}

Período:
${period}

Câmara/Turma:
${camara || "Todas"}

Matéria:
${materia || "Todas"}
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
      console.error("rapid-api OpenAI error", openAiResponse.status, await openAiResponse.text());
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

    result.theme = result.theme || theme;

    return Response.json(result, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno na pesquisa jurisprudencial.",
      },
      { status: 500, headers: corsHeaders },
    );
  }
});
