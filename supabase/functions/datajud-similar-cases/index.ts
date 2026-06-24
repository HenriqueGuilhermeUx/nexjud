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
  const code = clean.slice(13, 16)

  const map: Record<string, string> = {
    "826": "tjsp",
    "821": "tjrs",
    "819": "tjrj",
    "813": "tjmg",
    "403": "trf3",
    "502": "trt2",
    "515": "trt15",
  }

  return map[code] || fallback
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
    const classe = String(body.classe || "").trim()
    const assunto = String(body.assunto || "").trim()

    const alias = tribunalAlias || detectAlias(cnj)
    const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${alias}/_search`

    const must: any[] = []

    if (classe) {
      must.push({
        match: {
          "classe.nome": classe,
        },
      })
    }

    if (assunto) {
      must.push({
        match: {
          "assuntos.nome": assunto,
        },
      })
    }

    const query = {
      size: 50,
      query: {
        bool: {
          must: must.length ? must : [{ match_all: {} }],
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
    const cases = hits.map((h: any) => h._source).filter(Boolean)

    const total = data?.hits?.total?.value || cases.length

    const withMovements = cases.filter((c: any) =>
      Array.isArray(c.movimentos)
    )

    const hasSentence = withMovements.filter((c: any) =>
      JSON.stringify(c.movimentos || "")
        .toLowerCase()
        .includes("sentença")
    ).length

    const hasAppeal = withMovements.filter((c: any) =>
      JSON.stringify(c.movimentos || "")
        .toLowerCase()
        .includes("recurso")
    ).length

    const realPrediction = {
      alias,
      totalFound: total,
      sampledCases: cases.length,
      className: classe || "Não informada",
      subject: assunto || "Não informado",
      sentenceSignals: hasSentence,
      appealSignals: hasAppeal,
      historicalStrength:
        cases.length >= 30
          ? "Base amostral relevante"
          : cases.length >= 10
          ? "Base amostral moderada"
          : "Base amostral limitada",
      source: "DataJud/CNJ",
      warning:
        "Jurimetria baseada em amostra pública DataJud. Não representa garantia de resultado.",
    }

    return Response.json(
      {
        success: true,
        prediction: realPrediction,
        cases,
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno na jurimetria real.",
      },
      { status: 500, headers: corsHeaders }
    )
  }
})
