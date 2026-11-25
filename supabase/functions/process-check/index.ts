import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireUser } from "../_shared/requireUser.ts";
import { courtFromCnj, onlyDigits } from "../_shared/cnj.ts";
import { datajudSearch } from "../_shared/datajud.ts";

// Gasta: CNJ DataJud (CNJ_API_KEY) + OpenAI (gpt-4.1-mini) só quando o processo é encontrado.
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

    // deno-lint-ignore no-explicit-any
    let datajudData: any = null;

    if (CNJ_API_KEY) {
      try {
        const { response } = await datajudSearch(
          tribunal.alias,
          { query: { match: { numeroProcesso: onlyDigits(processNumber) } }, size: 1 },
          `APIKey ${CNJ_API_KEY}`,
        );

        if (response.ok) {
          datajudData = await response.json();
        }
      } catch (_e) {
        datajudData = null;
      }
    }

    const hit = datajudData?.hits?.hits?.[0]?._source;

    if (!hit) {
      return Response.json(
        {
          processNumber,
          found: false,
          court: tribunal.name,
          message: CNJ_API_KEY
            ? "Processo não encontrado na base pública do DataJud. Processos recentes ou em segredo de justiça podem não aparecer."
            : "Consulta ao DataJud indisponível no momento.",
        },
        { headers: corsHeaders },
      );
    }

    // deno-lint-ignore no-explicit-any
    const movimentos: any[] = [...(hit.movimentos || [])].sort((a, b) =>
      String(b.dataHora || "").localeCompare(String(a.dataHora || ""))
    );
    const lastMovement = movimentos[0];

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
Analise este processo brasileiro de forma estratégica. Não prometa resultado e não dê percentuais ou probabilidades. Use só os dados abaixo. Responda em um parágrafo executivo curto.

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
        found: true,
        source: "cnj-datajud",
        court: tribunal.name,
        phase: hit.classe?.nome || "Classe não informada",
        judge: hit.orgaoJulgador?.nome || "Órgão julgador não informado",
        // deno-lint-ignore no-explicit-any
        subjects: Array.isArray(hit.assuntos) ? hit.assuntos.map((a: any) => a?.nome).filter(Boolean) : [],
        filingDate: hit.dataAjuizamento || null,
        movementsCount: movimentos.length,
        lastMovement: lastMovement?.dataHora || null,
        lastMovementSummary: lastMovement?.nome || "Movimentação não identificada.",
        // deno-lint-ignore no-explicit-any
        recentMovements: movimentos.slice(0, 8).map((m: any) => ({ date: m.dataHora || null, name: m.nome || "Movimentação" })),
        executiveSummary,
        radar: [
          "Processo localizado na base DataJud.",
          `Classe: ${hit.classe?.nome || "não informada"}.`,
          `Órgão julgador: ${hit.orgaoJulgador?.nome || "não informado"}.`,
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
