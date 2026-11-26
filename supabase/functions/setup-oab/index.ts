import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireUser } from "../_shared/requireUser.ts";
import { escavadorGet } from "../_shared/escavador.ts";

// Código trazido da produção (versão 21) em 2026-11-25. O arquivo que estava no
// repositório era uma versão antiga (DataJud + Supabase service role) que não
// correspondia ao que estava publicado.
//
// Mudanças de segurança em relação à produção:
// - exige usuário logado (antes qualquer pessoa consultava a API paga do Escavador);
// - a resposta não devolve mais `debug.attempts` nem `receivedBody`, que expunham
//   até 1.500 caracteres de cada resposta bruta do Escavador e o corpo recebido;
// - o log registra só URL e status de cada tentativa, não o corpo.
// 2026-11-26: uma única chamada à rota documentada da API v2
// (GET /advogado/processos?oab_estado=&oab_numero=). Antes eram até 15 endereços
// tentados por busca, e cada tentativa podia consumir créditos.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function parseOAB(input: string) {
  const clean = input.toUpperCase().trim();

  const ufMatch = clean.match(
    /\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/
  );

  const number = clean.replace(/\D/g, "");

  return {
    raw: clean,
    uf: ufMatch?.[1] || "SP",
    number,
  };
}

// deno-lint-ignore no-explicit-any
function extractArray(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.data)) return data.data;

  // Escavador V2
  if (data.resposta && Array.isArray(data.resposta.items)) return data.resposta.items;
  if (data.resposta && Array.isArray(data.resposta.resultados)) return data.resposta.resultados;
  if (data.resultado && Array.isArray(data.resultado.items)) return data.resultado.items;
  if (data.resultado && Array.isArray(data.resultado.itens)) return data.resultado.itens;

  // Escavador V1 / formatos alternativos
  if (Array.isArray(data.sucesso)) return data.sucesso;
  if (data.resposta && Array.isArray(data.resposta.sucesso)) return data.resposta.sucesso;
  if (Array.isArray(data.processos)) return data.processos;
  if (Array.isArray(data.envolvido?.processos)) return data.envolvido.processos;
  if (Array.isArray(data.advogado?.processos)) return data.advogado.processos;

  return [];
}

// deno-lint-ignore no-explicit-any
function normalizeCase(item: any, index: number) {
  const processo = item.processo || item;
  // deno-lint-ignore no-explicit-any
  const fontes: any[] = Array.isArray(processo.fontes) ? processo.fontes : [];
  const fonte = fontes.find((f) => String(f?.tipo || "").toUpperCase() === "TRIBUNAL") || fontes[0] || null;
  const capa = fonte?.capa || {};

  const numeroCnj =
    processo.numero_cnj ||
    processo.numero ||
    item.numero_cnj ||
    item.numero ||
    item.processos_links?.[0]?.numero_cnj ||
    item.processos?.[0]?.numero_cnj ||
    `processo-${index + 1}`;

  return {
    id: String(processo.id || item.id || `esc-${index}`),
    caseNumber: numeroCnj,
    tribunal:
      fonte?.tribunal?.sigla ||
      fonte?.sigla ||
      processo.tribunal ||
      processo.origem ||
      processo.fonte ||
      item.tribunal ||
      item.origem ||
      "Tribunal não informado",
    natureza:
      capa.classe ||
      capa.assunto ||
      capa.area ||
      processo.classe ||
      processo.assunto ||
      processo.area ||
      item.classe ||
      item.assunto ||
      "Natureza não informada",
    valor: Number(capa.valor_causa?.valor || processo.valor_causa || processo.valor || item.valor_causa || item.valor || 0),
    parties: [processo.titulo_polo_ativo, processo.titulo_polo_passivo].filter(Boolean).join(" x ") || null,
    status: "Aguardando",
    judge:
      capa.orgao_julgador ||
      processo.juiz ||
      processo.orgao_julgador ||
      item.juiz ||
      item.orgao_julgador ||
      "Não informado",
    lastMovement:
      processo.data_ultima_movimentacao ||
      processo.updated_at ||
      item.data_ultima_movimentacao ||
      item.updated_at ||
      new Date().toISOString(),
    movementSummary:
      processo.ultima_movimentacao ||
      processo.resumo ||
      item.ultima_movimentacao ||
      item.resumo ||
      "Movimentação não informada.",
  };
}

// deno-lint-ignore no-explicit-any
function buildStats(cases: any[]) {
  const victories = cases.filter((c) => c.status === "Vitória").length;
  const defeats = cases.filter((c) => c.status === "Derrota").length;
  const pending = cases.filter((c) => c.status === "Aguardando").length;
  const decided = victories + defeats;
  const totalValue = cases.reduce((sum, c) => sum + Number(c.valor || 0), 0);

  return {
    totalCases: cases.length,
    totalValue,
    victories,
    defeats,
    pending,
    successRate: decided > 0 ? Math.round((victories / decided) * 100) : 0,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const auth = await requireUser(req, corsHeaders);
  if (!auth.ok) return auth.response;

  try {
    const ESCAVADOR_API_KEY = Deno.env.get("ESCAVADOR_API_KEY");

    if (!ESCAVADOR_API_KEY) {
      return Response.json(
        { error: "ESCAVADOR_API_KEY não configurada no Supabase." },
        { status: 500, headers: corsHeaders }
      );
    }

    const body = await req.json().catch(() => ({}));

    const oabInput = String(
      body.oabNumber ||
      body.oab ||
      body.oab_number ||
      body.numeroOab ||
      body.numero_oab ||
      body.query ||
      ""
    ).trim();

    if (!oabInput) {
      return Response.json(
        { error: "Informe o número da OAB." },
        { status: 400, headers: corsHeaders }
      );
    }

    const oab = parseOAB(oabInput);

    if (!oab.number || oab.number.length < 3) {
      return Response.json(
        { error: "Número de OAB inválido." },
        { status: 400, headers: corsHeaders }
      );
    }

    const result = await escavadorGet<any>("/advogado/processos", {
      oab_estado: oab.uf,
      oab_numero: oab.number,
      limit: 50,
    });
    console.log("setup-oab escavador", result.status, "credits:", result.credits);

    if (!result.ok && result.status !== 404) {
      return Response.json(
        {
          error: result.status === 402
            ? "A consulta por OAB está temporariamente indisponível (saldo do provedor de dados). Avise o suporte do NexJud."
            : "O provedor de dados não respondeu agora. Tente de novo em alguns minutos.",
        },
        { status: 503, headers: corsHeaders }
      );
    }

    // deno-lint-ignore no-explicit-any
    const selectedData: any = result.ok ? result.data : null;
    // deno-lint-ignore no-explicit-any
    const selectedItems: any[] = extractArray(selectedData);
    const lawyer = selectedData?.advogado_encontrado || null;
    const selectedSource = selectedItems.length ? "escavador-oab-processos" : "escavador-advogado-oab-sem-processos";

    if (!selectedData) {
      return Response.json(
        {
          oab: oab.raw,
          oabNumber: oab.number,
          oabState: oab.uf,
          source: "escavador-sem-dados",
          message: "Escavador não retornou dados para esta OAB.",
          cases: [],
          stats: {
            totalCases: 0,
            totalValue: 0,
            victories: 0,
            defeats: 0,
            pending: 0,
            successRate: 0,
          },
          insights: {
            strongestArea: "Nenhum processo encontrado para esta OAB.",
            weakPoint: "A consulta ao Escavador não retornou dados utilizáveis.",
            opportunity: "Confira o número e a UF da OAB.",
            recommendation: "Use a busca por processo individual pelo número CNJ.",
          },
        },
        { status: 200, headers: corsHeaders }
      );
    }

    const cases = selectedItems.slice(0, 50).map(normalizeCase);

    return Response.json(
      {
        oab: oab.raw,
        oabNumber: oab.number,
        oabState: oab.uf,
        source: selectedSource,
        lawyer: lawyer ? { name: lawyer.nome || null, totalProcesses: Number(lawyer.quantidade_processos || 0) || null } : null,
        message:
          cases.length > 0
            ? "Dados carregados via Escavador."
            : "Advogado localizado, mas a rota acessível não retornou processos.",
        cases,
        stats: buildStats(cases),
        insights: {
          strongestArea:
            cases.length > 0
              ? "Áreas de atuação identificadas a partir dos processos retornados."
              : "Advogado localizado sem lista processual disponível.",
          weakPoint:
            cases.length > 0
              ? "A classificação de vitórias e derrotas depende de análise das decisões dos processos."
              : "A API retornou o advogado, mas não retornou processos vinculados.",
          opportunity:
            cases.length > 0
              ? "Selecionar processos com movimentação recente para IA Preditiva e Red Team."
              : "Buscar por nome completo ou testar a verificação individual por número CNJ.",
          recommendation:
            cases.length > 0
              ? "Revise os processos carregados e rode Verificar Processo nos casos prioritários."
              : "Use a busca por processo individual enquanto liberamos a rota completa de processos por OAB.",
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Erro interno no Setup Zero OAB.",
      },
      { status: 500, headers: corsHeaders }
    );
  }
});
