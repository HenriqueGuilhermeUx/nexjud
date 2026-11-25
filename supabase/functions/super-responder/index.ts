import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireUser } from "../_shared/requireUser.ts";

// Código trazido da produção (versão 9) em 2026-11-25 e protegido com login.
// Gasta: OpenAI (gpt-4.1-mini, até 2500 tokens de saída por chamada).
// Chamada por src/lib/api.ts (performPredictiveAnalysis), usada só pela tela
// PredictiveAI, que hoje não tem rota (/dashboard/predictive redireciona).
// Candidata a desligamento na limpeza de módulos.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type CaseType = "TRABALHISTA" | "PREVIDENCIARIO" | "TRIBUTARIO";

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

    const caseNumber = String(body.caseNumber || "").trim();
    const caseDescription = String(body.caseDescription || "").trim();
    const caseType = String(body.caseType || "TRABALHISTA").trim().toUpperCase() as CaseType;

    if (!caseNumber || !caseDescription) {
      return Response.json(
        { error: "Informe número do processo e descrição do caso." },
        { status: 400, headers: corsHeaders },
      );
    }

    const prompt = `
Você é o NexJud, um sistema de inteligência jurídica estratégica para advogados brasileiros.

Analise o caso abaixo e devolva SOMENTE um JSON válido, sem markdown, sem texto antes ou depois.

Importante:
- Não prometa resultado.
- Não invente jurisprudência específica.
- Use linguagem técnica, prática e estratégica.
- O campo successProbability é uma estimativa estratégica de 0 a 100, baseada em força narrativa, prova, risco processual e coerência jurídica.
- riskLevel deve ser "BAIXO", "MÉDIO" ou "ALTO".
- A resposta deve seguir exatamente o schema abaixo.

Schema obrigatório:
{
  "caseNumber": "string",
  "analysisDate": "string ISO",
  "summary": {
    "successProbability": number,
    "riskLevel": "BAIXO" | "MÉDIO" | "ALTO",
    "recommendation": "string",
    "goldSuggestions": ["string", "string", "string"]
  },
  "judgeDNA": {
    "padroes": ["string", "string", "string"],
    "perfil": "string",
    "nivelExigencia": "string"
  },
  "redTeam": {
    "fraquezasDoSeuCaso": ["string", "string", "string"],
    "probabilidadeDeNegacao": number,
    "comoCorrigir": ["string", "string", "string", "string"]
  },
  "heatmap": {
    "zonaVerde": ["string", "string", "string"],
    "zonaAmarela": ["string", "string", "string"],
    "zonaVermelha": ["string", "string", "string"]
  }
}

Dados do caso:
Número do processo: ${caseNumber}
Tipo do caso: ${caseType}
Descrição do caso:
${caseDescription}
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
        max_output_tokens: 2500,
      }),
    });

    if (!openAiResponse.ok) {
      console.error("super-responder OpenAI error", openAiResponse.status, await openAiResponse.text());
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

    result.caseNumber = result.caseNumber || caseNumber;
    result.analysisDate = result.analysisDate || new Date().toISOString();

    return Response.json(result, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Erro interno na IA Preditiva.",
      },
      { status: 500, headers: corsHeaders },
    );
  }
});
