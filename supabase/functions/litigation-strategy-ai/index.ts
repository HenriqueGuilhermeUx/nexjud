import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { requireUser } from "../_shared/requireUser.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function fallback(caseText: string) {
  return {
    title: "Litigation Strategy AI",
    diagnosis: "Estratégia preliminar calculada em modo fallback.",
    successProbability: 72,
    riskLevel: "MÉDIO",
    executiveSummary:
      "O caso apresenta elementos suficientes para análise estratégica, mas depende da força documental, risco de prova e postura da parte contrária.",
    planA: {
      name: "Plano A — Entrada estruturada",
      objective: "Organizar prova documental, definir tese principal e preparar abordagem inicial.",
      steps: [
        "Consolidar documentos essenciais.",
        "Identificar tese jurídica principal.",
        "Quantificar impacto financeiro.",
        "Preparar minuta inicial.",
      ],
    },
    planB: {
      name: "Plano B — Negociação controlada",
      objective: "Usar a força documental para buscar acordo antes de escalar custo processual.",
      steps: [
        "Enviar proposta objetiva.",
        "Definir valor mínimo aceitável.",
        "Preparar contra-argumentos.",
      ],
    },
    evidence: [
      "Documentos contratuais.",
      "Comprovantes financeiros.",
      "Protocolos e comunicações.",
      "Linha do tempo dos fatos.",
    ],
    checklist: [
      "Validar prescrição e competência.",
      "Revisar documentos obrigatórios.",
      "Estimar risco de sucumbência.",
      "Definir estratégia de acordo.",
    ],
    nextMove: "Organizar provas e gerar minuta inicial com base na estratégia recomendada.",
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  const auth = await requireUser(req, corsHeaders)
  if (!auth.ok) return auth.response

  try {
    const { caseText } = await req.json()
    const text = String(caseText || "").trim()

    if (!text) {
      return Response.json({ error: "caseText obrigatório." }, { status: 400, headers: corsHeaders })
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")

    if (!OPENAI_API_KEY) {
      return Response.json(fallback(text), { headers: corsHeaders })
    }

    const prompt = `
Você é um sócio sênior de contencioso estratégico no Brasil.

Analise o caso abaixo e devolva SOMENTE JSON válido.

Caso:
${text}

JSON esperado:
{
  "title": "string",
  "diagnosis": "string",
  "successProbability": number,
  "riskLevel": "BAIXO|MÉDIO|ALTO",
  "executiveSummary": "string",
  "planA": {"name":"string","objective":"string","steps":["string"]},
  "planB": {"name":"string","objective":"string","steps":["string"]},
  "evidence": ["string"],
  "checklist": ["string"],
  "nextMove": "string"
}
`

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: "Responda apenas JSON válido." },
          { role: "user", content: prompt },
        ],
      }),
    })

    const json = await response.json()
    const content = json?.choices?.[0]?.message?.content || ""

    try {
      return Response.json(JSON.parse(content), { headers: corsHeaders })
    } catch {
      return Response.json({ ...fallback(text), raw: content }, { headers: corsHeaders })
    }
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Erro litigation-strategy-ai" },
      { status: 500, headers: corsHeaders }
    )
  }
})
