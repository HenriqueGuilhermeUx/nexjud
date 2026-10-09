import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "jsr:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function scoreText(text: string, query: string) {
  const normalizedText = String(text || "").toLowerCase()
  const words = String(query || "")
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 3)

  if (words.length === 0) return 0

  return words.reduce((score, word) => {
    return normalizedText.includes(word) ? score + 1 : score
  }, 0)
}

function detectLitigationMode(question: string) {
  const q = question.toLowerCase()

  return {
    labor:
      q.includes("clt") ||
      q.includes("trabalh") ||
      q.includes("empregado") ||
      q.includes("rescis"),

    insolvency:
      q.includes("recuperação judicial") ||
      q.includes("falência") ||
      q.includes("holding") ||
      q.includes("grupo econômico") ||
      q.includes("fraude") ||
      q.includes("arresto") ||
      q.includes("penhora") ||
      q.includes("execução"),

    tax:
      q.includes("tribut") ||
      q.includes("receita") ||
      q.includes("pis") ||
      q.includes("cofins"),

    corporate:
      q.includes("sociedade") ||
      q.includes("holding") ||
      q.includes("acionista"),

    family:
      q.includes("inventário") ||
      q.includes("divórcio"),

    criminal:
      q.includes("crime") ||
      q.includes("prisão"),
  }
}

function detectIntent(question: string) {
  const q = question.toLowerCase()

  const documentReviewKeywords = [
    "estatuto",
    "contrato",
    "cláusula",
    "clausula",
    "artigo",
    "ata",
    "regimento",
    "assinatura",
    "assinar",
    "assina",
    "pode assinar",
    "prazo",
    "pode",
    "permite",
    "permitido",
    "proíbe",
    "proibe",
    "autoriza",
    "assembleia",
    "eleição",
    "eleicao",
    "diretoria",
    "tesoureiro",
    "presidente",
    "conselho fiscal",
  ]

  const litigationKeywords = [
    "execução",
    "execucao",
    "penhora",
    "holding",
    "fraude",
    "arresto",
    "grupo econômico",
    "grupo economico",
    "recuperação judicial",
    "recuperacao judicial",
    "bloqueio",
    "constrição",
    "constricao",
    "indenização",
    "indenizacao",
    "tática",
    "tatica",
    "liminar",
    "tutela",
  ]

  if (documentReviewKeywords.some((word) => q.includes(word))) {
    return "DOCUMENT_REVIEW"
  }

  if (litigationKeywords.some((word) => q.includes(word))) {
    return "LITIGATION"
  }

  return "GENERAL"
}

function detectDealBreaker(question: string) {
  const q = question.toLowerCase()

  if (
    q.includes("recuperação judicial") ||
    q.includes("holding") ||
    q.includes("grupo econômico")
  ) {
    return {
      severity: "CRÍTICO",
      title: "Perda da garantia patrimonial",
      recommendation:
        "Priorizar imediatamente medidas de constrição patrimonial e preservação do patrimônio útil."
    }
  }

  if (
    q.includes("prescrição") ||
    q.includes("decadência")
  ) {
    return {
      severity: "CRÍTICO",
      title: "Risco de perda do direito",
      recommendation:
        "Verificar imediatamente prazos prescricionais."
    }
  }

  if (
    q.includes("prova")
  ) {
    return {
      severity: "ALTO",
      title: "Fragilidade probatória",
      recommendation:
        "Priorizar produção antecipada de provas."
    }
  }

  return {
    severity: "NORMAL",
    title: "Nenhum Deal Breaker identificado",
    recommendation: ""
  }
}

function detectUrgency(question: string) {
  const q = question.toLowerCase()

  const criticalWords = [
    "liminar",
    "tutela",
    "arresto",
    "recuperação judicial",
    "falência",
    "holding",
    "grupo econômico",
    "fraude",
    "blindagem",
    "penhora",
    "execução",
    "alienação",
    "venda de bens",
    "sisbajud",
    "renajud",
    "cnib",
    "indisponibilidade"
  ]

  const found = criticalWords.filter(word => q.includes(word))

  if (found.length >= 3) {
    return {
      level: "CRÍTICO",
      priority: "IMEDIATA",
      words: found,
    }
  }

  if (found.length >= 1) {
    return {
      level: "ALTO",
      priority: "24 HORAS",
      words: found,
    }
  }

  return {
    level: "NORMAL",
    priority: "SEM URGÊNCIA",
    words: [],
  }
}

function detectAssetProtection(question: string, context: string) {
  const text = (question + " " + context).toLowerCase()

  const assets = {
    holding: text.includes("holding"),
    grupoEconomico:
      text.includes("grupo econômico") ||
      text.includes("grupo economico"),

    recuperacao:
      text.includes("recuperação judicial") ||
      text.includes("recuperacao judicial"),

    falencia: text.includes("falência") || text.includes("falencia"),

    imoveis:
      text.includes("imóvel") ||
      text.includes("imoveis") ||
      text.includes("matrícula") ||
      text.includes("matricula"),

    socios: text.includes("sócio") || text.includes("socio"),

    fraude: text.includes("fraude"),

    execucao: text.includes("execução") || text.includes("execucao"),
  }

  const recommendations: string[] = []

  if (assets.holding)
    recommendations.push(
      "Avaliar responsabilidade patrimonial da holding."
    )

  if (assets.grupoEconomico)
    recommendations.push(
      "Analisar inclusão do grupo econômico no polo passivo."
    )

  if (assets.recuperacao)
    recommendations.push(
      "Priorizar preservação do patrimônio útil antes da execução."
    )

  if (assets.imoveis)
    recommendations.push(
      "Pesquisar matrículas e avaliar medidas cautelares sobre imóveis."
    )

  if (assets.fraude)
    recommendations.push(
      "Verificar atos de disposição patrimonial potencialmente fraudulentos."
    )

  if (assets.execucao)
    recommendations.push(
      "Antecipar medidas de constrição patrimonial compatíveis com o caso."
    )

  return {
    assets,
    recommendations,
  }
}

function buildLitigationChess(question: string, context: string) {
  const text = (question + " " + context).toLowerCase()

  const attacks: string[] = []
  const defenses: string[] = []

  if (text.includes("recuperação judicial") || text.includes("recuperacao judicial")) {
    attacks.push(
      "Alegar que todos os créditos devem respeitar o juízo universal da Recuperação Judicial."
    )

    defenses.push(
      "Demonstrar a natureza do crédito e os fundamentos legais aplicáveis ao caso concreto."
    )
  }

  if (text.includes("holding")) {
    attacks.push(
      "Sustentar autonomia patrimonial da holding."
    )

    defenses.push(
      "Demonstrar unidade econômica, direção comum ou grupo econômico conforme os fatos."
    )
  }

  if (text.includes("grupo econômico") || text.includes("grupo economico")) {
    attacks.push(
      "Negar a existência de grupo econômico."
    )

    defenses.push(
      "Produzir provas da atuação coordenada, identidade de sócios, patrimônio e administração."
    )
  }

  if (text.includes("fraude")) {
    attacks.push(
      "Negar intenção fraudulenta na alienação."
    )

    defenses.push(
      "Demonstrar cronologia dos atos e prejuízo aos credores."
    )
  }

  if (text.includes("prescrição")) {
    attacks.push(
      "Arguir prescrição total ou parcial."
    )

    defenses.push(
      "Verificar causas interruptivas ou suspensivas."
    )
  }

  return {
    attacks,
    defenses,
  }
}

function buildVictoryPlan(
  urgency: any,
  dealBreaker: any,
  assetProtection: any
) {
  const today: string[] = []
  const week: string[] = []
  const month: string[] = []

  if (urgency.level === "CRÍTICO") {
    today.push("Protocolar imediatamente as medidas urgentes.")
    today.push("Avaliar pedido de tutela de urgência.")
  }

  if (dealBreaker.severity === "CRÍTICO") {
    today.push(dealBreaker.recommendation)
  }

  if (assetProtection.assets.holding) {
    today.push("Avaliar responsabilização patrimonial da holding.")
  }

  if (assetProtection.assets.grupoEconomico) {
    today.push("Analisar inclusão do grupo econômico no polo passivo.")
  }

  if (assetProtection.assets.imoveis) {
    today.push("Pesquisar matrículas e verificar constrições possíveis.")
  }

  week.push("Produzir todas as provas documentais.")
  week.push("Atualizar cronologia dos fatos.")
  week.push("Revisar precedentes recentes.")

  month.push("Preparar estratégia para instrução.")
  month.push("Planejar recursos e medidas futuras.")
  month.push("Monitorar movimentações patrimoniais.")

  return {
    today,
    week,
    month,
  }
}

function calculateStrategyScore(
  urgency: any,
  dealBreaker: any,
  assetProtection: any
) {

  let score = 100

  if (urgency.level === "CRÍTICO")
    score -= 20

  if (dealBreaker.severity === "CRÍTICO")
    score -= 20

  if (assetProtection.assets.fraude)
    score -= 15

  if (assetProtection.assets.recuperacao)
    score -= 10

  if (assetProtection.assets.grupoEconomico)
    score -= 10

  return Math.max(score, 10)
}

function calculateConfidence(context: string) {

    let score = 60

    const text = context.toLowerCase()

    if (text.includes("knowledge document"))
        score += 10

    if (text.includes("legal case"))
        score += 10

    if (text.includes("legal memory"))
        score += 8

    if (text.includes("conversation history"))
        score += 5

    if (text.includes("tribunal"))
        score += 5

    if (text.includes("stj"))
        score += 5

    if (text.includes("stf"))
        score += 5

    return Math.min(score,100)

}

function rankKnowledge(
  documents: any[],
  memories: any[],
  legalCases: any[]
) {
  const ranked = []

  for (const doc of documents) {
    ranked.push({
      type: "DOCUMENT",
      title: doc.title,
      score: 100,
      created_at: doc.created_at,
    })
  }

  for (const item of legalCases) {
    ranked.push({
      type: "CASE",
      title: item.title,
      score: 90,
      created_at: item.created_at,
    })
  }

  for (const item of memories) {
    ranked.push({
      type: "MEMORY",
      title: item.title,
      score: item.importance || 70,
      created_at: item.created_at,
    })
  }

  ranked.sort((a, b) => b.score - a.score)

  return ranked
}

function detectContradictions(documents: any[]) {

  const contradictions: string[] = []

  for (let i = 0; i < documents.length; i++) {

    for (let j = i + 1; j < documents.length; j++) {

      const a = String(documents[i].content || "").toLowerCase()
      const b = String(documents[j].content || "").toLowerCase()

      if (
        a.includes("14 imóveis") &&
        b.includes("16 imóveis")
      ) {
        contradictions.push(
          `Quantidade diferente de imóveis entre "${documents[i].title}" e "${documents[j].title}".`
        )
      }

      if (
        a.includes("recuperação judicial") &&
        !b.includes("recuperação judicial")
      ) {
        contradictions.push(
          `"${documents[j].title}" não menciona a Recuperação Judicial presente em outro documento.`
        )
      }

    }

  }

  return contradictions

}

function truncate(text: string, max = 2500) {
  const value = String(text || "")
  return value.length > max ? value.slice(0, max) + "..." : value
}

async function generateQueryEmbedding(text: string, openAiKey: string) {
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

  if (!response.ok) {
    throw new Error("Erro ao gerar embedding da pergunta.")
  }

  return json.data?.[0]?.embedding || []
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

    const authHeader = req.headers.get("Authorization") || ""
    const accessToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : ""
    if (!accessToken) throw new Error("Sessão NexJud obrigatória.")

    const { data: authData, error: authError } = await supabase.auth.getUser(accessToken)
    if (authError || !authData.user) throw new Error("Sessão NexJud inválida ou expirada.")

    const body = await req.json().catch(() => ({}))

    const requestedUserId = String(body.userId || "").trim()
    const userId = authData.user.id
    if (requestedUserId && requestedUserId !== userId) {
      throw new Error("A conta autenticada não corresponde ao usuário solicitado.")
    }

const sessionId = String(body.sessionId || "").trim()
const message = String(body.message || "").trim()
const caseId = body.caseId ? String(body.caseId) : null

const intent = detectIntent(message)
const litigationMode = detectLitigationMode(message)
const dealBreaker = detectDealBreaker(message)
const urgency = detectUrgency(message)

let strategicMode = "CONSULTIVO"

if (litigationMode.insolvency) {
  strategicMode = "INSOLVENCY"
} else if (litigationMode.labor) {
  strategicMode = "LABOR"
} else if (litigationMode.tax) {
  strategicMode = "TAX"
} else if (litigationMode.corporate) {
  strategicMode = "CORPORATE"
} else if (litigationMode.family) {
  strategicMode = "FAMILY"
} else if (litigationMode.criminal) {
  strategicMode = "CRIMINAL"
}

    if (!message) throw new Error("message obrigatório.")

    let casesQuery = supabase
      .from("legal_cases")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(12)

    if (caseId) {
      casesQuery = casesQuery.eq("id", caseId)
    }

    let documentsQuery = supabase
      .from("knowledge_documents")
      .select("id,title,document_type,client_name,process_number,summary,content,tags,file_url,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20)

    if (caseId) {
      documentsQuery = documentsQuery.eq("case_id", caseId)
    }

    let chunksQuery = supabase
      .from("knowledge_chunks")
      .select("id,document_id,case_id,chunk_number,content,tokens,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(80)

    if (caseId) {
      chunksQuery = chunksQuery.eq("case_id", caseId)
    }

    let semanticChunks: any[] = []

try {
  const queryEmbedding = await generateQueryEmbedding(message, OPENAI_API_KEY)

  const { data: semanticData, error: semanticError } = await supabase.rpc(
    "match_knowledge_chunks",
    {
      query_embedding: queryEmbedding,
      match_threshold: 0.68,
      match_count: 10,
      p_user_id: userId,
    }
  )

  if (!semanticError && semanticData) {
    semanticChunks = semanticData
  }
} catch (err) {
  console.warn("Busca semântica indisponível, usando busca textual.", err)
}

    const [
  casesResult,
  documentsResult,
  chunksResult,
  memoryResult,
  jurisprudenceResult,
  precedentsResult,
  cnjResult,
  messagesResult,
  copilotResult,
] = await Promise.all([
  casesQuery,

  documentsQuery,

  chunksQuery,

  supabase
    .from("legal_memory")
    .select("title,content,memory_type,importance,tags,created_at")
    .eq("user_id", userId)
    .order("importance", { ascending: false })
    .limit(20),

  supabase
    .from("legal_jurisprudence")
    .select("title,court,area,theme,summary,content,source_url,process_number,tags,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(12),

    supabase
  .from("legal_precedents")
  .select("title,tribunal,tema,numero,resumo,fundamento,impacto,tags,created_at")
  .eq("user_id", userId)
  .order("created_at", { ascending: false })
  .limit(12),

  supabase
  .from("cnj_processes")
  .select("process_number,court,class_name,subject,parties,movements,last_movement,last_movement_at,raw_data,created_at,updated_at")
  .eq("user_id", userId)
  .order("updated_at", { ascending: false })
  .limit(10),

  sessionId
    ? supabase
        .from("chat_messages")
        .select("role,content,created_at")
        .eq("session_id", sessionId)
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(30)
    : Promise.resolve({ data: [], error: null }),

  supabase
    .from("ai_copilot_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(8),
])

    if (casesResult.error) throw casesResult.error
    if (documentsResult.error) throw documentsResult.error
    if (chunksResult.error) throw chunksResult.error
    if (memoryResult.error) throw memoryResult.error
    if (jurisprudenceResult.error) throw jurisprudenceResult.error
    if (precedentsResult.error) throw precedentsResult.error
    if (cnjResult.error) throw cnjResult.error
    if (messagesResult.error) throw messagesResult.error
    if (copilotResult.error) throw copilotResult.error

    const cases = casesResult.data || []
    const documents = documentsResult.data || []
    const chunks = chunksResult.data || []
    const memory = memoryResult.data || []
    const jurisprudence = jurisprudenceResult.data || []
    const precedents = precedentsResult.data || []
    const cnjProcesses = cnjResult.data || []
    const previousMessages = messagesResult.data || []
    const copilotSessions = copilotResult.data || []

    const rankedChunks = chunks
      .map((chunk: any) => ({
        ...chunk,
        relevance: scoreText(chunk.content, message),
      }))
      .sort((a: any, b: any) => b.relevance - a.relevance)
      .slice(0, 12)

    const rankedDocuments = documents
      .map((doc: any) => ({
        ...doc,
        relevance: scoreText(
          `${doc.title || ""} ${doc.summary || ""} ${doc.content || ""} ${Array.isArray(doc.tags) ? doc.tags.join(" ") : ""}`,
          message
        ),
      }))
      .sort((a: any, b: any) => b.relevance - a.relevance)
      .slice(0, 8)

    const rankedMemory = memory
      .map((item: any) => ({
        ...item,
        relevance:
          scoreText(`${item.title || ""} ${item.content || ""} ${Array.isArray(item.tags) ? item.tags.join(" ") : ""}`, message) +
          Number(item.importance || 0),
      }))
      .sort((a: any, b: any) => b.relevance - a.relevance)
      .slice(0, 10)

      const rankedKnowledge = rankKnowledge(
  documents,
  memory,
  cases
)

const contradictions = detectContradictions(
  documents
)

    const context = `

BUSCA SEMÂNTICA / TRECHOS MAIS RELEVANTES:
${
  semanticChunks.length === 0
    ? "Nenhum trecho semântico encontrado."
    : semanticChunks
        .map(
          (c: any) => `
- Similaridade: ${Math.round((c.similarity || 0) * 100)}%
Documento: ${c.document_id}
Trecho:
${truncate(c.content, 1800)}
`
        )
        .join("\n")
}

========================

CASOS JURÍDICOS:
${cases
  .map(
    (c: any) => `
- ${c.title || "Caso"}
Cliente: ${c.client_name || "-"}
Processo: ${c.process_number || "-"}
Adversário: ${c.opponent_name || "-"}
Tribunal/Vara: ${c.court || "-"}
Status: ${c.status || "-"}
Risco: ${c.risk_level || "-"}
Chance: ${c.success_probability || 0}%
Resumo: ${truncate(c.summary, 1200)}
`
  )
  .join("\n")}

DOCUMENTOS MAIS RELEVANTES:
${rankedDocuments
  .map(
    (d: any) => `
- ${d.title}
Tipo: ${d.document_type || "-"}
Cliente: ${d.client_name || "-"}
Processo: ${d.process_number || "-"}
Tags: ${Array.isArray(d.tags) ? d.tags.join(", ") : "-"}
Resumo: ${truncate(d.summary || d.content, 1600)}
Arquivo: ${d.file_url || "-"}
`
  )
  .join("\n")}

TRECHOS/CHUNKS MAIS RELEVANTES:
${rankedChunks
  .map(
    (c: any) => `
- Documento ID: ${c.document_id}
Chunk: ${c.chunk_number}
Relevância: ${c.relevance}
Conteúdo:
${truncate(c.content, 1800)}
`
  )
  .join("\n")}

JURISPRUDÊNCIA SALVA:
${jurisprudence
  .map(
    (j: any) => `
- ${j.title}
Tribunal: ${j.court || "-"}
Área: ${j.area || "-"}
Tema: ${j.theme || "-"}
Processo/Tema: ${j.process_number || "-"}
Resumo: ${truncate(j.summary || "", 1000)}
Conteúdo: ${truncate(j.content || "", 1800)}
Fonte: ${j.source_url || "-"}
Tags: ${Array.isArray(j.tags) ? j.tags.join(", ") : "-"}
`
  )
  .join("\n")}

========================

PRECEDENTES INTELIGENTES:
${precedents
  .map(
    (p: any) => `
- ${p.title}
Tribunal: ${p.tribunal || "-"}
Tema: ${p.tema || "-"}
Número: ${p.numero || "-"}
Impacto: ${p.impacto || "-"}
Resumo: ${truncate(p.resumo || "", 1000)}
Fundamento: ${truncate(p.fundamento || "", 1800)}
Tags: ${Array.isArray(p.tags) ? p.tags.join(", ") : "-"}
`
  )
  .join("\n")}

========================

PROCESSOS CNJ:
${cnjProcesses
  .map(
    (p: any) => `
- Processo: ${p.process_number}
Tribunal: ${p.court || "-"}
Classe: ${p.class_name || "-"}
Assunto: ${p.subject || "-"}
Última movimentação: ${p.last_movement || "-"}
Data da última movimentação: ${p.last_movement_at || "-"}
Partes: ${JSON.stringify(p.parties || [])}
Movimentações: ${JSON.stringify(p.movements || []).slice(0, 1800)}
`
  )
  .join("\n")}

========================

MEMÓRIA JURÍDICA:
${rankedMemory
  .map(
    (m: any) => `
- ${m.title}
Tipo: ${m.memory_type || "-"}
Importância: ${m.importance || "-"}
Conteúdo: ${truncate(m.content, 1000)}
Tags: ${Array.isArray(m.tags) ? m.tags.join(", ") : "-"}
`
  )
  .join("\n")}

HISTÓRICO RECENTE DO CHAT:
${previousMessages
  .slice(-20)
  .map((m: any) => `${String(m.role || "").toUpperCase()}: ${truncate(m.content, 1200)}`)
  .join("\n")}

ÚLTIMAS ANÁLISES DO AI COPILOT:
${copilotSessions
  .map(
    (s: any) => `
- Data: ${s.created_at || "-"}
Caso/Pergunta: ${truncate(s.prompt || s.input || s.question || "", 1000)}
Resumo: ${truncate(s.executive_summary || s.summary || s.result || "", 1200)}
Chance: ${s.success_probability || 0}%
Risco: ${s.risk_level || "-"}
Decisão: ${s.decision || "-"}
Próximo passo: ${s.next_move || "-"}
`
  )
  .join("\n")}
`
const assetProtection = detectAssetProtection(
  message,
  context
)

const litigationChess = buildLitigationChess(
    message,
    context
)

const victoryPlan = buildVictoryPlan(
    urgency,
    dealBreaker,
    assetProtection
)

const strategyScore = calculateStrategyScore(
    urgency,
    dealBreaker,
    assetProtection
)

const confidenceScore = calculateConfidence(context)

    const prompt = `
INTENÇÃO DA PERGUNTA:
${intent}

${
  intent === "DOCUMENT_REVIEW"
    ? `
Você está atuando como advogado especialista em revisão documental.

Sua prioridade é responder com base no documento, não criar estratégia processual genérica.

Regras obrigatórias para DOCUMENT_REVIEW:

1. Primeiro responda objetivamente: SIM, NÃO ou NÃO É POSSÍVEL CONCLUIR.
2. Localize e cite a cláusula, artigo, trecho ou regra do documento usado.
3. Explique o fundamento documental.
4. Se o documento disser que são necessárias duas assinaturas, diga claramente que uma assinatura isolada não atende ao estatuto.
5. Não fale de holding, fraude, penhora, arresto, grupo econômico, recuperação judicial ou proteção patrimonial, salvo se isso estiver no documento ou na pergunta.
6. Não use estrutura de litígio se a pergunta for apenas interpretação de estatuto, contrato, ata ou cláusula.
7. Se o trecho exato não estiver no contexto, diga que o documento recuperado não trouxe a cláusula suficiente e peça o artigo/cláusula específica.
`
    : `
Você é o Litigation Commander™ do NexJud.

Você NÃO responde como chatbot jurídico genérico.
Você responde como sócio de contencioso estratégico.

Seu objetivo NÃO é apenas explicar Direito.
Seu objetivo é aumentar a probabilidade de vitória do cliente.
`
}

Modo Estratégico:
${strategicMode}

Deal Breaker Detectado:

${dealBreaker.title}

Severidade:

${dealBreaker.severity}

Recomendação Automática:

${dealBreaker.recommendation}

========================

URGÊNCIA PROCESSUAL

Nível:

${urgency.level}

Prioridade:

${urgency.priority}

Palavras críticas detectadas:

${urgency.words.join(", ")}

Sempre que a urgência for ALTA ou CRÍTICA:

• priorize medidas liminares

• priorize constrição patrimonial

• priorize preservação de provas

• nunca deixe essas medidas para o final da resposta

========================

ASSET PROTECTION ENGINE

Patrimônio identificado:

Holding: ${assetProtection.assets.holding}

Grupo Econômico: ${assetProtection.assets.grupoEconomico}

Recuperação Judicial: ${assetProtection.assets.recuperacao}

Falência: ${assetProtection.assets.falencia}

Imóveis: ${assetProtection.assets.imoveis}

Sócios: ${assetProtection.assets.socios}

Fraude: ${assetProtection.assets.fraude}

Execução: ${assetProtection.assets.execucao}

Recomendações Patrimoniais:

${assetProtection.recommendations.join("\n")}

Você NÃO responde como um chatbot.

Você responde como um sócio de um escritório especializado em litígios complexos.

Seu objetivo NÃO é explicar Direito.

Seu objetivo é aumentar a probabilidade de vitória do cliente.

ETAPA 1 — CLASSIFICAÇÃO

Antes de elaborar qualquer resposta, classifique internamente a solicitação em apenas UMA categoria.

Essa classificação é obrigatória e deve controlar todo o restante da resposta.

Escolha apenas um:

1. Document Review

2. Consulta Jurídica

3. Estratégia Processual

4. Produção de Documento

5. Pesquisa Jurídica

6. Processo CNJ

7. Jurisprudência

8. Precedentes

A estrutura da resposta deve mudar conforme o tipo identificado.

Nunca misture categorias.

Exemplos:

• Se a pergunta for apenas interpretação de um documento, responda exclusivamente como Document Review.

• Não utilize Strategy Engine.

• Não utilize Litigation Chess.

• Não utilize Victory Plan.

• Não utilize Deal Breaker.

• Não proponha ações judiciais sem solicitação do usuário.

Somente utilize módulos estratégicos quando o usuário pedir estratégia, risco, planejamento processual ou probabilidade de êxito.

Nunca utilize Strategy Engine para perguntas exclusivamente documentais.

Nunca utilize Deal Breaker, Litigation Chess ou Victory Plan quando o usuário apenas solicitar interpretação de um documento.

Use SOMENTE as informações existentes no CONTEXTO abaixo.

A partir de agora, sua resposta deve usar o CONTEXT BUILDER 2.0.

Você deve separar claramente as fontes:

1. DOCUMENTOS / KNOWLEDGE BASE
- Use para fatos extraídos de documentos enviados.
- Se a pergunta for documental, responda primeiro com base nesses documentos.

2. JURISPRUDÊNCIA SALVA
- Use para fundamentos, entendimentos e teses salvas pelo usuário.
- Não trate jurisprudência salva como fato do caso.

3. PRECEDENTES INTELIGENTES
- Use para temas, repetitivos, IRDR, repercussão geral e precedentes qualificados.
- Sempre explique aplicabilidade e possível distinção.

4. PROCESSOS CNJ
- Use para contexto processual, classe, assunto, movimentações e status.
- Não invente movimentações.

5. MEMÓRIA JURÍDICA
- Use como aprendizado interno do escritório.

6. HISTÓRICO DO CHAT
- Use para manter continuidade da conversa.

7. STRATEGY ENGINE
- Use apenas quando a pergunta pedir estratégia, risco, execução, litígio ou plano de ação.

Regra principal:
- Se for pergunta documental, responda como Document Review.
- Se for pergunta estratégica, responda como Litigation Strategy.
- Se for pergunta de fundamentação, traga base legal, jurisprudência, precedentes e depois estratégia.
- Nunca misture fatos do documento com jurisprudência ou estratégia sem avisar a fonte.

Nunca invente fatos.

Nunca crie documentos inexistentes.

Sempre priorize:

• tutela de urgência
• arresto
• indisponibilidade
• preservação patrimonial
• produção antecipada de provas
• estratégia processual
• redução de riscos

Quando identificar:

- Recuperação Judicial
- Falência
- Holding
- Grupo Econômico
- Blindagem Patrimonial
- Fraude
- Execução
- Penhora

considere automaticamente que existe ALTO RISCO de perda patrimonial.

Nesses casos, NÃO responda de forma genérica.

Priorize medidas urgentes.

========================

CONTEXTO

${context}

========================

DOCUMENTOS MAIS IMPORTANTES

${rankedKnowledge
.slice(0,5)
.map(
d=>`${d.score} - ${d.type} - ${d.title}`
)
.join("\n")}

========================

POSSÍVEIS CONTRADIÇÕES

${contradictions.length === 0
? "Nenhuma contradição relevante encontrada."
: contradictions.join("\n")}

========================

PERGUNTA

${message}

========================

Sua resposta deve seguir a estrutura abaixo, conforme a intenção detectada.

${
  intent === "DOCUMENT_REVIEW"
    ? `
# Resposta objetiva

Responda primeiro com uma destas opções:

SIM.

NÃO.

NÃO É POSSÍVEL CONCLUIR COM O CONTEXTO ATUAL.

# Trecho ou cláusula utilizada

Cite o artigo, cláusula ou trecho do documento que sustenta a resposta.

Se o trecho exato não estiver no contexto recuperado, diga isso expressamente.

# Fundamento documental

Explique por que o documento permite, proíbe ou não esclarece a conduta perguntada.

# Aplicação prática

Explique o efeito prático.

Exemplo: se o estatuto exigir assinatura conjunta de Presidente e Tesoureiro, uma assinatura isolada não deve ser aceita.

# Risco se agir diferente

Explique o risco de descumprir o documento.

# Documentos ou informações faltantes

Liste apenas o que realmente falta para aumentar a segurança da resposta.

Não inclua Deal Breaker, Asset Protection, Litigation Chess ou Victory Plan em perguntas puramente documentais.
`
    : `

    # Fontes consideradas

Indique exatamente quais fontes foram utilizadas nesta resposta.

Exemplo:

• Documento enviado
• OCR
• Knowledge Base
• Jurisprudência Salva
• Precedentes
• Processos CNJ
• Memória Jurídica
• Histórico da conversa

Não liste fontes que não foram utilizadas.

========================

CONFIDENCE SCORE™

${confidenceScore}/100

Interprete esta nota.

Quanto menor for esta nota:

• mais cautelosa deve ser sua resposta

• destaque documentos faltantes

• indique quais provas aumentariam a confiança.

Nunca afirme algo que não esteja claramente suportado pelo contexto.

========================

Strategy Score™

${strategyScore}/100

Interprete esta pontuação antes de responder.

Quanto menor a pontuação, mais agressiva deve ser a estratégia processual.

Sempre explique quais fatores reduziram a pontuação.

# Fontes consideradas

Informe objetivamente quais fontes foram utilizadas nesta análise.

Marque apenas as que realmente participaram da resposta.

• Documentos enviados

• OCR

• Knowledge Base

• Jurisprudência Salva

• Precedentes Inteligentes

• Processos CNJ

• Memória Jurídica

• Casos cadastrados

• Histórico da conversa

• Strategy Engine

Para cada fonte utilizada, explique em uma frase como ela influenciou a conclusão.

Nunca invente uma fonte que não tenha sido utilizada.

# Executive Summary

# Deal Breaker

# Immediate Actions (24 horas)

# Tactical Actions (7 dias)

# Strategic Actions (30 dias)

# Asset Protection Strategy

# Litigation Chess™

Ataques prováveis:

${litigationChess.attacks.join("\n")}

Como neutralizar cada ataque:

${litigationChess.defenses.join("\n")}

Classifique o risco de cada ataque e explique por que ele pode comprometer o resultado do processo.

# Evidence Missing

# Grau de Confiabilidade

Explique:

Quais fatos possuem alta confiança.

Quais fatos possuem confiança média.

Quais fatos dependem de novos documentos.

Nunca apresente inferências como fatos comprovados.

# Chances de Êxito

Explique os fatores positivos e negativos.

# Victory Plan™

Hoje:

${victoryPlan.today.join("\n")}

Próximos 7 dias:

${victoryPlan.week.join("\n")}

Próximos 30 dias:

${victoryPlan.month.join("\n")}

Explique por que esta sequência aumenta a probabilidade de êxito.
`
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
          {
            role: "system",
            content:
              "Você é um assistente jurídico contextual. Não substitui advogado. Não invente fatos. Use o contexto fornecido com precisão.",
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
        {
          error: "Erro OpenAI",
          details: json,
        },
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
          cases: cases.length,
          documents: documents.length,
          chunks: chunks.length,
          selectedChunks: rankedChunks.length,
          memory: memory.length,
          jurisprudence: jurisprudence.length,
          precedents: precedents.length,
          cnjProcesses: cnjProcesses.length,
          selectedMemory: rankedMemory.length,
          previousMessages: previousMessages.length,
          copilotSessions: copilotSessions.length,
        },
        sources: {
          documents: rankedDocuments.map((d: any) => ({
            id: d.id,
            title: d.title,
            type: d.document_type,
            client: d.client_name,
            process: d.process_number,
            fileUrl: d.file_url,
            relevance: d.relevance,
          })),
          chunks: rankedChunks.map((c: any) => ({
            id: c.id,
            documentId: c.document_id,
            chunkNumber: c.chunk_number,
            relevance: c.relevance,
          })),
          memory: rankedMemory.map((m: any) => ({
            title: m.title,
            type: m.memory_type,
            importance: m.importance,
            relevance: m.relevance,
          })),
        },
        raw: json,
      },
      { headers: corsHeaders }
    )
  } catch (error) {
  const message =
    error instanceof Error
      ? error.message
      : JSON.stringify(error)

  console.error("LEGAL_CHAT_AI_ERROR:", message)

  return Response.json(
    {
      error: message || "Erro legal-chat-ai.",
    },
    { status: 400, headers: corsHeaders }
  )
}
})