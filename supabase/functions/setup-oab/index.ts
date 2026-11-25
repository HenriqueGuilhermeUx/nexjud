import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireUser } from "../_shared/requireUser.ts";

// Código trazido da produção (versão 21) em 2026-11-25. O arquivo que estava no
// repositório era uma versão antiga (DataJud + Supabase service role) que não
// correspondia ao que estava publicado.
//
// Mudanças de segurança em relação à produção:
// - exige usuário logado (antes qualquer pessoa consultava a API paga do Escavador);
// - a resposta não devolve mais `debug.attempts` nem `receivedBody`, que expunham
//   até 1.500 caracteres de cada resposta bruta do Escavador e o corpo recebido;
// - o log registra só URL e status de cada tentativa, não o corpo.

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
      processo.tribunal ||
      processo.origem ||
      processo.fonte ||
      item.tribunal ||
      item.origem ||
      "Tribunal não informado",
    natureza:
      processo.classe ||
      processo.assunto ||
      processo.area ||
      item.classe ||
      item.assunto ||
      "Natureza não informada",
    valor: Number(processo.valor_causa || processo.valor || item.valor_causa || item.valor || 0),
    status: "Aguardando",
    judge:
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

async function escavadorGet(url: string, token: string) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  const text = await response.text();

  return {
    url,
    status: response.status,
    ok: response.ok,
    body: text,
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

    const baseV2 = "https://api.escavador.com/api/v2";
    const baseV1 = "https://api.escavador.com/api/v1";

    const urls = [
      // V2 — variações OAB
      `${baseV2}/advogados/oab/${oab.number}/${oab.uf}/processos`,
      `${baseV2}/advogados/oab/${oab.number}/${oab.uf}`,
      `${baseV2}/advogados/oab/${oab.uf}/${oab.number}/processos`,
      `${baseV2}/advogados/oab/${oab.uf}/${oab.number}`,

      `${baseV2}/envolvidos/oab/${oab.number}/${oab.uf}/processos`,
      `${baseV2}/envolvidos/oab/${oab.number}/${oab.uf}`,
      `${baseV2}/envolvidos/oab/${oab.uf}/${oab.number}/processos`,
      `${baseV2}/envolvidos/oab/${oab.uf}/${oab.number}`,

      `${baseV2}/busca?q=${encodeURIComponent(`OAB ${oab.uf} ${oab.number}`)}&tipo=advogado`,
      `${baseV2}/busca?q=${encodeURIComponent(`OAB ${oab.uf} ${oab.number}`)}&tipo=envolvido`,
      `${baseV2}/busca?q=${encodeURIComponent(`${oab.number} ${oab.uf}`)}`,

      // V1 — fallback
      `${baseV1}/oab/${oab.uf}/${oab.number}`,
      `${baseV1}/oab/${oab.number}/${oab.uf}`,
      `${baseV1}/busca/termo?q=${encodeURIComponent(`OAB ${oab.uf} ${oab.number}`)}`,
      `${baseV1}/busca/termo?q=${encodeURIComponent(oab.number)}`,
    ];

    const attempts: { url: string; status: number; ok: boolean }[] = [];
    // deno-lint-ignore no-explicit-any
    let selectedData: any = null;
    let selectedSource = "";
    // deno-lint-ignore no-explicit-any
    let selectedItems: any[] = [];

    for (const url of urls) {
      const attempt = await escavadorGet(url, ESCAVADOR_API_KEY);

      attempts.push({ url: attempt.url, status: attempt.status, ok: attempt.ok });

      if (!attempt.ok) continue;

      // deno-lint-ignore no-explicit-any
      let data: any = null;

      try {
        data = JSON.parse(attempt.body);
      } catch (_error) {
        continue;
      }

      const items = extractArray(data);

      if (items.length > 0) {
        selectedData = data;
        selectedItems = items;
        selectedSource = url.includes("/processos")
          ? "escavador-oab-processos"
          : url.includes("/advogados/oab")
          ? "escavador-advogado-oab"
          : url.includes("/envolvidos/oab")
          ? "escavador-envolvido-oab"
          : "escavador-busca";
        break;
      }

      if (data?.id || data?.nome || data?.advogado || data?.envolvido) {
        selectedData = data;
        selectedItems = extractArray(data);
        selectedSource = url.includes("/advogados/oab")
          ? "escavador-advogado-oab-sem-processos"
          : "escavador-oab-sem-processos";
        break;
      }
    }

    console.log("setup-oab escavador attempts", JSON.stringify(attempts));

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

    const cases = selectedItems.slice(0, 20).map(normalizeCase);

    return Response.json(
      {
        oab: oab.raw,
        oabNumber: oab.number,
        oabState: oab.uf,
        source: selectedSource,
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
