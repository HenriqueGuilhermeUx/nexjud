import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Espelho da produção (versão 11), copiado em 2026-11-25. Sem mudanças de lógica.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function getDraftProfile(draftType: string) {
  // deno-lint-ignore no-explicit-any
  const profiles: Record<string, any> = {
    peticao_inicial: {
      label: "Petição Inicial",
      structure: [
        "Endereçamento",
        "Qualificação das partes",
        "Síntese dos fatos",
        "Fundamentos jurídicos",
        "Provas essenciais",
        "Pedidos",
        "Valor da causa",
        "Fechamento estratégico",
      ],
    },
    contestacao: {
      label: "Contestação",
      structure: [
        "Síntese defensiva",
        "Preliminares",
        "Impugnação específica dos fatos",
        "Mérito",
        "Impugnação das provas",
        "Tese alternativa",
        "Pedidos",
      ],
    },
    recurso: {
      label: "Recurso",
      structure: [
        "Tempestividade e cabimento",
        "Síntese da decisão recorrida",
        "Pontos de reforma",
        "Razões recursais",
        "Demonstração do prejuízo",
        "Pedido de reforma",
      ],
    },
    impugnacao: {
      label: "Impugnação",
      structure: [
        "Delimitação do ponto impugnado",
        "Correção técnica da narrativa",
        "Contraposição probatória",
        "Fundamentos jurídicos",
        "Pedidos específicos",
      ],
    },
    memoriais: {
      label: "Memoriais",
      structure: [
        "Resumo executivo",
        "Pontos incontroversos",
        "Provas favoráveis",
        "Fragilidades da parte contrária",
        "Tese final",
        "Conclusão persuasiva",
      ],
    },
    sustentacao_oral: {
      label: "Sustentação Oral",
      structure: [
        "Abertura de impacto",
        "Contexto em 30 segundos",
        "Três argumentos centrais",
        "Resposta ao principal risco",
        "Pedido final objetivo",
      ],
    },
  };

  return profiles[draftType] || profiles.peticao_inicial;
}

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
    const draftType = String(body.draftType || "peticao_inicial");
    const focus = String(body.focus || "").trim();

    if (!caseText) {
      return Response.json(
        { error: "Texto do caso é obrigatório." },
        { status: 400, headers: corsHeaders }
      );
    }

    const profile = getDraftProfile(draftType);

    const prompt = `
Você é o NexJud Draft Generator™, uma IA para gerar minutas jurídicas estratégicas para advogados brasileiros.

Objetivo:
Gerar uma minuta ESTRUTURAL, útil e prática, adequada ao tipo de peça.

Tipo de peça:
${profile.label}

Estrutura obrigatória esperada para este tipo:
${profile.structure.map((x: string, i: number) => `${i + 1}. ${x}`).join("\n")}

Foco estratégico:
${focus || "Defender os pontos fracos identificados pelo Red Team e fortalecer a tese principal."}

Caso:
${caseText}

Regras:
- Não invente jurisprudência específica.
- Não cite número de processo inexistente.
- Não substitua revisão do advogado.
- Seja prático, técnico e específico.
- A estrutura deve respeitar o tipo de peça.
- Se for sustentação oral, escreva em tom oral, persuasivo e direto.
- Se for contestação, inclua impugnação específica e tese alternativa.
- Se for recurso, inclua cabimento, erro da decisão e pedido de reforma.
- Se for petição inicial, inclua narrativa dos fatos, fundamentos e pedidos.
- Se for memoriais, foque em convencimento final.
- Se for impugnação, foque em rebater ponto específico.

Responda SOMENTE JSON válido, sem markdown:

{
  "title": "título da minuta",
  "draftType": "${profile.label}",
  "strategicObjective": "objetivo estratégico da peça",
  "mainThesis": "tese central",
  "weakPointsToDefend": ["ponto fraco 1", "ponto fraco 2", "ponto fraco 3"],
  "structure": [
    {
      "section": "nome da seção",
      "purpose": "finalidade da seção",
      "content": "texto sugerido para essa seção"
    }
  ],
  "evidenceToAttach": ["documento/prova 1", "documento/prova 2"],
  "argumentChecklist": ["argumento 1", "argumento 2", "argumento 3"],
  "closingRequests": ["pedido 1", "pedido 2", "pedido 3"],
  "riskWarnings": ["alerta 1", "alerta 2"],
  "oralPreparation": ["pergunta difícil 1", "pergunta difícil 2", "resposta recomendada"],
  "finalNote": "observação final ao advogado"
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
        temperature: 0.2,
        max_output_tokens: 4200,
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
            : "Erro interno no Draft Generator.",
      },
      { status: 500, headers: corsHeaders }
    );
  }
});
