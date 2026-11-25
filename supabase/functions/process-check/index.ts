import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireUser } from "../_shared/requireUser.ts";

// Código trazido da produção (versão 8) em 2026-11-25 e protegido com login.
// Gasta: CNJ DataJud (CNJ_API_KEY) + OpenAI (gpt-4.1-mini).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function getTribunalFromCNJ(processNumber: string) {
  if (processNumber.includes(".8.26.")) return { code: "tjsp", name: "TJSP" };
  if (processNumber.includes(".5.02.")) return { code: "trt2", name: "TRT-2" };
  if (processNumber.includes(".4.03.")) return { code: "trf3", name: "TRF-3" };
  return { code: "tjsp", name: "TJSP" };
}

function demoResult(processNumber: string) {
  return {
    processNumber,
    source: "demo-fallback",
    court: getTribunalFromCNJ(processNumber).name,
    phase: "Concluso para sentença",
    judge: "Magistrado não identificado",
    riskLevel: "MÉDIO",
    successProbability: 68,
    lastMovement: new Date().toISOString(),
    lastMovementSummary: "Movimentação recente identificada ou simulada para análise estratégica.",
    executiveSummary:
      "O processo parece estar em fase relevante e exige atenção estratégica. Recomenda-se verificar prazos, reforçar documentos e preparar manifestação preventiva.",
    radar: [
      "Processo ativo ou com numeração CNJ válida.",
      "Fase processual exige atenção.",
      "Há oportunidade de reforçar a estratégia antes da próxima decisão.",
      "Recomenda-se revisar documentos essenciais.",
    ],
    nextLikelyEvents: [
      { event: "Sentença ou decisão", probability: 42 },
      { event: "Despacho", probability: 25 },
      { event: "Audiência/perícia", probability: 18 },
      { event: "Acordo", probability: 10 },
      { event: "Extinção", probability: 5 },
    ],
    alerts: [
      "Confirmar prazo aberto no processo.",
      "Revisar última movimentação.",
      "Preparar resposta preventiva.",
    ],
    recommendation:
      "Monte uma linha do tempo, destaque provas centrais e antecipe a objeção mais provável da parte contrária.",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = await requireUser(req, corsHeaders);
  if (!auth.ok) return auth.response;

  try {
    const CNJ_API_KEY = Deno.env.get("CNJ_API_KEY");
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    const body = await req.json().catch(() => ({}));
    const processNumber = String(body.processNumber || "").trim();

    if (!processNumber) {
      return Response.json({ error: "Informe o número do processo." }, { status: 400, headers: corsHeaders });
    }

    const tribunal = getTribunalFromCNJ(processNumber);

    // deno-lint-ignore no-explicit-any
    let datajudData: any = null;

    if (CNJ_API_KEY) {
      try {
        const response = await fetch(`https://api-publica.datajud.cnj.jus.br/api_publica_${tribunal.code}/_search`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `APIKey ${CNJ_API_KEY}`,
          },
          body: JSON.stringify({
            query: {
              match: {
                numeroProcesso: processNumber.replace(/\D/g, ""),
              },
            },
            size: 1,
          }),
        });

        if (response.ok) {
          datajudData = await response.json();
        }
      } catch (_e) {
        datajudData = null;
      }
    }

    const hit = datajudData?.hits?.hits?.[0]?._source;

    if (!hit) {
      return Response.json(demoResult(processNumber), { headers: corsHeaders });
    }

    const movimentos = hit.movimentos || [];
    const lastMovement = movimentos[movimentos.length - 1] || movimentos[0];

    let executiveSummary =
      "Processo localizado na base DataJud. Recomenda-se análise estratégica da última movimentação, fase processual e documentos disponíveis.";

    if (OPENAI_API_KEY) {
      try {
        const ai = await fetch("https://api.openai.com/v1/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4.1-mini",
            temperature: 0.2,
            max_output_tokens: 700,
            input: `
Analise este processo brasileiro de forma estratégica. Não prometa resultado. Responda em um parágrafo executivo curto.

Dados:
${JSON.stringify(hit).slice(0, 8000)}
`,
          }),
        });

        const aiJson = await ai.json();
        executiveSummary = aiJson.output_text || executiveSummary;
      } catch (_e) {
        // mantém o resumo padrão
      }
    }

    return Response.json(
      {
        processNumber,
        source: "cnj-datajud",
        court: tribunal.name,
        phase: hit.classe?.nome || "Fase não identificada",
        judge: hit.orgaoJulgador?.nome || "Órgão julgador não identificado",
        riskLevel: "MÉDIO",
        successProbability: 66,
        lastMovement: lastMovement?.dataHora || new Date().toISOString(),
        lastMovementSummary: lastMovement?.nome || "Movimentação não identificada.",
        executiveSummary,
        radar: [
          "Processo localizado na base DataJud.",
          `Classe: ${hit.classe?.nome || "não informada"}.`,
          `Órgão julgador: ${hit.orgaoJulgador?.nome || "não informado"}.`,
          "Revisar movimentações recentes antes de qualquer petição.",
        ],
        nextLikelyEvents: [
          { event: "Despacho/decisão", probability: 38 },
          { event: "Manifestação das partes", probability: 27 },
          { event: "Sentença", probability: 20 },
          { event: "Audiência/perícia", probability: 10 },
          { event: "Arquivamento/extinção", probability: 5 },
        ],
        alerts: [
          "Verificar prazos no sistema do tribunal.",
          "Conferir documentos juntados recentemente.",
          "Avaliar se há oportunidade de manifestação estratégica.",
        ],
        recommendation:
          "Use a movimentação mais recente para decidir se é melhor reforçar prova, provocar andamento, negociar ou aguardar decisão.",
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Erro interno na verificação do processo." },
      { status: 500, headers: corsHeaders },
    );
  }
});
