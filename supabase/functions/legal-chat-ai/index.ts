import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function truncate(text: string, max = 2500) {
  const value = String(text || "")
  return value.length > max ? value.slice(0, max) + "..." : value
}

async function generateEmbedding(text: string, openAiKey: string) {
  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text.slice(0, 8000),
    }),
  })

  const json = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(JSON.stringify(json))

  return json.data?.[0]?.embedding || []
}

function detectMode(text: string) {
  const q = text.toLowerCase()
  return {
    insolvency:
      q.includes("recuperação judicial") ||
      q.includes("falência") ||
      q.includes("holding") ||
      q.includes("grupo econômico") ||
      q.includes("fraude") ||
      q.includes("arresto") ||
      q.includes("penhora") ||
      q.includes("execução"),
    labor:
      q.includes("clt") ||
      q.includes("trabalh") ||
      q.includes("empregado") ||
      q.includes("rescis"),
  }
}

function buildStrategy(text: string, context: string) {
  const all = `${text} ${context}`.toLowerCase()
  const mode = detectMode(all)

  const assetRisk =
    mode.insolvency ||
    all.includes("imóvel") ||
    all.includes("imoveis") ||
    all.includes("matrícula") ||
    all.includes("blindagem")

  const dealBreaker = assetRisk
    ? "Perda da garantia patrimonial antes da constrição judicial."
    : "Nenhum deal breaker crítico identificado com segurança no contexto."

  const urgency = assetRisk ? "CRÍTICO" : "MÉDIO"

  const strategyScore = assetRisk ? 55 : 78
  const confidenceScore = context.length > 1000 ? 82 : 55

  const immediateActions = assetRisk
    ? [
        "Priorizar medidas urgentes de preservação patrimonial.",
        "Avaliar inclusão imediata de empresas relacionadas no polo passivo quando houver base fática.",
        "Requerer medidas cautelares compatíveis com o rito e a competência do caso.",
        "Pesquisar matrículas, sócios, grupo econômico, sucessão empresarial e atos de disposição patrimonial.",
      ]
    : [
        "Organizar documentos essenciais.",
        "Validar tese principal.",
        "Identificar provas faltantes.",
      ]

  return {
    mode,
    dealBreaker,
    urgency,
    strategyScore,
    confidenceScore,
    immediateActions,
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY")

    if (!SUPABASE_URL) throw new Error("SUPABASE_URL ausente.")
    if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY ausente.")
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY ausente.")

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const body = await req.json().catch(() => ({}))

    const userId = String(body.userId || "").trim()
    const sessionId = String(body.sessionId || "").trim()
    const message = String(body.message || "").trim()
    const caseId = body.caseId ? String(body.caseId) : null

    if (!userId) throw new Error("userId obrigatório.")
    if (!message) throw new Error("message obrigatório.")

    const queryEmbedding = await generateEmbedding(message, OPENAI_API_KEY)

    let semanticChunks: any[] = []

    if (queryEmbedding.length > 0) {
      const { data } = await supabase.rpc("match_knowledge_chunks", {
        query_embedding: queryEmbedding,
        match_threshold: 0.68,
        match_count: 12,
        p_user_id: userId,
      })

      semanticChunks = data || []
    }

    let casesQuery = supabase
      .from("legal_cases")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(12)

    if (caseId) casesQuery = casesQuery.eq("id", caseId)

    const [
      casesResult,
      documentsResult,
      memoryResult,
      messagesResult,
      copilotResult,
    ] = await Promise.all([
      casesQuery,

      supabase
        .from("knowledge_documents")
        .select("id,title,document_type,client_name,process_number,summary,content,tags,file_url,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(12),

      supabase
        .from("legal_memory")
        .select("title,content,memory_type,importance,tags,created_at")
        .eq("user_id", userId)
        .order("importance", { ascending: false })
        .limit(12),

      sessionId
        ? supabase
            .from("chat_messages")
            .select("role,content,created_at")
            .eq("session_id", sessionId)
            .eq("user_id", userId)
            .order("created_at", { ascending: true })
            .limit(24)
        : Promise.resolve({ data: [], error: null }),

      supabase
        .from("ai_copilot_sessions")
        .select("prompt,executive_summary,success_probability,risk_level,decision,next_move,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(6),
    ])

    if (casesResult.error) throw casesResult.error
    if (documentsResult.error) throw documentsResult.error
    if (memoryResult.error) throw memoryResult.error
    if (messagesResult.error) throw messagesResult.error
    if (copilotResult.error) throw copilotResult.error

    const cases = casesResult.data || []
    const documents = documentsResult.data || []
    const memory = memoryResult.data || []
    const previousMessages = messagesResult.data || []
    const copilotSessions = copilotResult.data || []

    const semanticContext = semanticChunks
      .map(
        (c: any) => `
Chunk similaridade ${Math.round((c.similarity || 0) * 100)}%
Documento: ${c.document_id}
${truncate(c.content, 2200)}
`
      )
      .join("\n\n")

    const context = `
BUSCA SEMÂNTICA / TRECHOS MAIS RELEVANTES:
${semanticContext || "Nenhum chunk semântico encontrado."}

CASOS JURÍDICOS:
${cases
  .map(
    (c: any) => `
- ${c.title || "Caso"}
Cliente: ${c.client_name || "-"}
Processo: ${c.process_number || "-"}
Adversário: ${c.opponent_name || "-"}
Risco: ${c.risk_level || "-"}
Chance: ${c.success_probability || 0}%
Resumo: ${truncate(c.summary, 1200)}
`
  )
  .join("\n")}

DOCUMENTOS:
${documents
  .map(
    (d: any) => `
- ${d.title}
Tipo: ${d.document_type || "-"}
Cliente: ${d.client_name || "-"}
Processo: ${d.process_number || "-"}
Resumo: ${truncate(d.summary || d.content, 1200)}
Arquivo: ${d.file_url || "-"}
`
  )
  .join("\n")}

MEMÓRIA JURÍDICA:
${memory
  .map(
    (m: any) => `
- ${m.title}
Tipo: ${m.memory_type || "-"}
Importância: ${m.importance || "-"}
Conteúdo: ${truncate(m.content, 1000)}
`
  )
  .join("\n")}

HISTÓRICO DO CHAT:
${previousMessages
  .slice(-18)
  .map((m: any) => `${String(m.role || "").toUpperCase()}: ${truncate(m.content, 1000)}`)
  .join("\n")}

AI COPILOT:
${copilotSessions
  .map(
    (s: any) => `
- ${truncate(s.prompt, 800)}
Resumo: ${truncate(s.executive_summary, 1000)}
Risco: ${s.risk_level || "-"}
Decisão: ${s.decision || "-"}
Próximo passo: ${s.next_move || "-"}
`
  )
  .join("\n")}
`

    const strategy = buildStrategy(message, context)

    const prompt = `
Você é o Litigation Commander™ do NexJud.

Você NÃO responde como chatbot jurídico genérico.
Você responde como sócio de contencioso estratégico.

Use SOMENTE o contexto abaixo para fatos do caso.
Não invente fatos.
Se faltar documento, diga que falta.

========================
STRATEGY ENGINE
========================

Modo Insolvência/Patrimônio:
${strategy.mode.insolvency}

Modo Trabalhista:
${strategy.mode.labor}

Deal Breaker:
${strategy.dealBreaker}

Urgency Level:
${strategy.urgency}

Strategy Score:
${strategy.strategyScore}/100

Confidence Score:
${strategy.confidenceScore}/100

Immediate Actions recomendadas:
${strategy.immediateActions.map((a) => `- ${a}`).join("\n")}

========================
CONTEXTO
========================

${context}

========================
PERGUNTA
========================

${message}

Responda obrigatoriamente com:

# Executive Summary

# Deal Breaker

# Urgency Level

# Immediate Actions (24 horas)

# Tactical Actions (7 dias)

# Strategic Actions (30 dias)

# Asset Protection Strategy

# Litigation Chess™

# Evidence Missing

# Grau de Confiabilidade

# Chances de Êxito

# Victory Plan™

Se houver risco patrimonial, recuperação judicial, holding, grupo econômico, fraude ou penhora:
- priorize constrição, cautelares, arresto, indisponibilidade e preservação patrimonial;
- não recomende apenas "analisar documentos";
- indique a medida processual mais rápida e por quê.
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
          {
            role: "system",
            content:
              "Você é um estrategista jurídico. Seja prudente, mas tático. Não invente fatos. Use o contexto fornecido.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    })

    const json = await response.json().catch(() => ({}))

    if (!response.ok) {
      return Response.json(
        { error: "Erro OpenAI", details: json },
        { status: 400, headers: corsHeaders }
      )
    }

    const answer =
      json?.choices?.[0]?.message?.content ||
      "Não foi possível gerar resposta."

    return Response.json(
      {
        answer,
        contextUsed: {
          semanticChunks: semanticChunks.length,
          cases: cases.length,
          documents: documents.length,
          memory: memory.length,
          previousMessages: previousMessages.length,
          copilotSessions: copilotSessions.length,
          strategy,
        },
        sources: {
          semanticChunks,
        },
        raw: json,
      },
      { headers: corsHeaders }
    )
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Erro legal-chat-ai.",
      },
      { status: 500, headers: corsHeaders }
    )
  }
})
