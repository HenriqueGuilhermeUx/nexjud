import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function onlyNumbers(value: string) {
  return String(value || "").replace(/\D/g, "")
}

function detectAlias(cnj: string, fallback = "tjsp") {
  const clean = onlyNumbers(cnj)

  const tribunalCode = clean.slice(13, 16)

  const map: Record<string, string> = {
    "826": "tjsp",
    "821": "tjrs",
    "819": "tjrj",
    "813": "tjmg",
    "815": "tjpb",
    "804": "tjam",
    "405": "trf5",
    "403": "trf3",
    "402": "trf2",
    "401": "trf1",
    "404": "trf4",
    "406": "trf6",
    "502": "trt2",
    "515": "trt15",
  }

  return map[tribunalCode] || fallback
}

function normalizeMovements(source: any) {
  const movements =
    source.movimentos ||
    source.movimentacoes ||
    source.movimento ||
    []

  if (!Array.isArray(movements)) return []

  return movements.slice(-20).reverse().map((m: any) => ({
    date: m.dataHora || m.data || m.dtMovimento || null,
    name:
      m.nome ||
      m.descricao ||
      m.movimentoNacional?.descricao ||
      m.codigoMovimento ||
      "Movimentação",
    complement:
      m.complementosTabelados ||
      m.complemento ||
      m.texto ||
      "",
  }))
}

function normalizeProcess(source: any) {
  return {
    number:
      source.numeroProcesso ||
      source.numero ||
      source.numero_cnj ||
      "-",
    court:
      source.tribunal ||
      source.siglaTribunal ||
      source.orgaoJulgador?.nome ||
      "-",
    courtUnit:
      source.orgaoJulgador?.nome ||
      source.unidadeOrigem?.nome ||
      "-",
    className:
      source.classe?.nome ||
      source.classeProcessual?.nome ||
      source.classe ||
      "-",
    subject:
      Array.isArray(source.assuntos)
        ? source.assuntos.map((a: any) => a.nome || a.descricao).filter(Boolean).join(", ")
        : source.assunto?.nome || "-",
    filingDate:
      source.dataAjuizamento ||
      source.dataDistribuicao ||
      source.created_at ||
      null,
    parties:
      source.partes ||
      source.poloAtivo ||
      [],
    movements: normalizeMovements(source),
    raw: source,
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const DATAJUD_API_KEY = Deno.env.get("DATAJUD_API_KEY")

    if (!DATAJUD_API_KEY) {
      return Response.json(
        { error: "DATAJUD_API_KEY não configurada." },
        { status: 500, headers: corsHeaders }
      )
    }

    const body = await req.json().catch(() => ({}))

    const cnj = String(body.cnj || "").trim()
    const tribunalAlias = String(body.tribunalAlias || "").trim()

    if (!cnj) {
      return Response.json(
        { error: "Número CNJ obrigatório." },
        { status: 400, headers: corsHeaders }
      )
    }

    const alias = tribunalAlias || detectAlias(cnj)
    const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${alias}/_search`

    const query = {
      size: 1,
      query: {
        match: {
          numeroProcesso: onlyNumbers(cnj),
        },
      },
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: DATAJUD_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(query),
    })

    const text = await response.text()

    if (!response.ok) {
      return Response.json(
        {
          error: "Erro ao consultar DataJud.",
          status: response.status,
          body: text,
          alias,
        },
        { status: response.status, headers: corsHeaders }
      )
    }

    const data = JSON.parse(text)
    const hits = data?.hits?.hits || []

    const process = hits[0]?._source ? normalizeProcess(hits[0]._source) : null

    return Response.json(
      {
        success: true,
        alias,
        found: Boolean(process),
        process,
        total: data?.hits?.total?.value || hits.length || 0,
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao consultar DataJud.",
      },
      { status: 500, headers: corsHeaders }
    )
  }
})
