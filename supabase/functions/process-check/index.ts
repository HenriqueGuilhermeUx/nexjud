import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireUser } from "../_shared/requireUser.ts";
import { courtFromCnj } from "../_shared/cnj.ts";
import { lookupFailureMessage, lookupProcess } from "../_shared/processData.ts";

// Gasta: Escavador (capa + movimentações; DataJud como reserva) + OpenAI (gpt-4.1-mini) só quando o processo é encontrado.
// Regra do produto: nenhum percentual de êxito ou de "próximo evento" sem modelo validado.
// Por isso não há successProbability, riskLevel nem probabilidades, e não existe
// resultado de demonstração quando o DataJud não encontra o processo.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

    const tribunal = courtFromCnj(processNumber);
    if (!tribunal) {
      return Response.json(
        { error: "Tribunal não identificado pelo número. Por enquanto cobrimos Tribunais de Justiça, TRFs e TRTs." },
        { status: 400, headers: corsHeaders },
      );
    }

    const lookup = await lookupProcess(processNumber, {
      movements: true,
      includeParties: true,
      includeMovementText: true,
      datajudAuthorization: CNJ_API_KEY ? `APIKey ${CNJ_API_KEY}` : undefined,
    });

    if (!lookup.found) {
      const failure = lookupFailureMessage(lookup);
      return Response.json(
        { processNumber, found: false, court: tribunal.name, message: failure.message },
        { status: failure.status, headers: corsHeaders },
      );
    }

    const p = lookup.summary;
    const sourceLabel = lookup.source === "escavador" ? "Escavador" : "DataJud (CNJ)";
    const lastMovement = p.recentMovements[0];

    let executiveSummary =
      `Processo localizado (${sourceLabel}). Recomenda-se análise estratégica da última movimentação, fase processual e documentos disponíveis.`;

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
Analise este processo brasileiro de forma estratégica. Não prometa resultado e não dê percentuais ou probabilidades. Use só os dados abaixo. Responda em um parágrafo executivo curto.

Dados:
${JSON.stringify({ ...p, parties: undefined }).slice(0, 8000)}
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
        found: true,
        source: lookup.source,
        sourceLabel,
        court: p.court || tribunal.name,
        phase: p.className || "Classe não informada",
        judge: p.courtUnit || "Órgão julgador não informado",
        subjects: p.subjects,
        area: p.area,
        causeValue: p.causeValue,
        filingDate: p.filingDate,
        restricted: p.restricted,
        activeSide: p.activeSide ?? null,
        passiveSide: p.passiveSide ?? null,
        parties: p.parties ?? [],
        sourceUrl: p.sourceUrl ?? null,
        movementsCount: p.movementsCount,
        lastMovement: p.lastMovementDate || lastMovement?.date || null,
        lastMovementSummary: lastMovement?.content || lastMovement?.name || "Movimentação não identificada.",
        recentMovements: p.recentMovements.slice(0, 8),
        executiveSummary,
        radar: [
          `Processo localizado (${sourceLabel}).`,
          `Classe: ${p.className || "não informada"}.`,
          `Órgão julgador: ${p.courtUnit || "não informado"}.`,
          "Revisar movimentações recentes antes de qualquer petição.",
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
