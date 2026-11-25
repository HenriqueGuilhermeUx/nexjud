import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { requireUser } from "../_shared/requireUser.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// deno-lint-ignore no-explicit-any
function clampScore(value: any) {
  const n = Number(value || 0);
  if (n <= 10 && n > 0) return Math.round(n * 10);
  if (n > 100) return 100;
  if (n < 0) return 0;
  return Math.round(n);
}

// deno-lint-ignore no-explicit-any
function arr(value: any, limit = 6) {
  return Array.isArray(value) ? value.slice(0, limit) : [];
}

// deno-lint-ignore no-explicit-any
function normalizeResult(result: any) {
  const caseDna = result.caseDna || {};

  const normalizedCaseDna = {
    provas: clampScore(caseDna.provas),
    jurisprudencia: clampScore(caseDna.jurisprudencia),
    prescricao: clampScore(caseDna.prescricao),
    nexo: clampScore(caseDna.nexo),
    danoMoral: clampScore(caseDna.danoMoral),
  };

  return {
    title: result.title || "Análise Estratégica NexJud",
    successProbability: clampScore(result.successProbability),
    riskLevel: result.riskLevel || "Médio",
    complexity: result.complexity || "Média",
    financialPotential: result.financialPotential || "Não informado",

    executiveSummary:
      result.executiveSummary ||
      "Análise estratégica gerada com base nas informações fornecidas.",

    caseDna: normalizedCaseDna,

    heatmap: [
      ["Força das Provas", normalizedCaseDna.provas],
      ["Jurisprudência Favorável", normalizedCaseDna.jurisprudencia],
      ["Risco de Prescrição", normalizedCaseDna.prescricao],
      ["Nexo Causal", normalizedCaseDna.nexo],
      ["Dano Moral", normalizedCaseDna.danoMoral],
    ],

    dealBreakers: arr(result.dealBreakers, 5),
    redTeam: arr(result.redTeam, 5),
    strategyEngine: arr(result.strategyEngine, 6),

    judgeDna: {
      valoriza: arr(result.judgeDna?.valoriza, 5).length
        ? arr(result.judgeDna?.valoriza, 5)
        : ["Documentos", "Linha do tempo clara", "Prova objetiva"],
      rejeita: arr(result.judgeDna?.rejeita, 5).length
        ? arr(result.judgeDna?.rejeita, 5)
        : ["Alegações genéricas", "Pedidos excessivos", "Prova frágil"],
    },

    winningThesis: result.winningThesis || "Tese vencedora não identificada.",
    defenseThesis: result.defenseThesis || "Tese defensiva provável não identificada.",
    evidenceChecklist: arr(result.evidenceChecklist, 8),
    settlementRecommendation:
      result.settlementRecommendation || "Avaliar acordo após complementação probatória.",
    nextMoves: arr(result.nextMoves, 5),

    partnerDecision: result.partnerDecision || "ACEITARIA COM CAUTELA",
    partnerReason:
      result.partnerReason ||
      "Caso exige validação jurídica e reforço probatório antes de decisão final.",

    jurisprudencePrediction: {
      favorableRate: clampScore(result.jurisprudencePrediction?.favorableRate),
      trend: result.jurisprudencePrediction?.trend || "Indefinida",
      favorableFactors: arr(result.jurisprudencePrediction?.favorableFactors, 5),
      unfavorableFactors: arr(result.jurisprudencePrediction?.unfavorableFactors, 5),
      thesisStrength:
        result.jurisprudencePrediction?.thesisStrength ||
        "Força jurisprudencial não estimada.",
      warning:
        result.jurisprudencePrediction?.warning ||
        "Estimativa baseada apenas no caso informado, sem base jurisprudencial externa conectada.",
    },

    financialExposure: {
      bestCase: result.financialExposure?.bestCase || "Não informado",
      probableCase: result.financialExposure?.probableCase || "Não informado",
      worstCase: result.financialExposure?.worstCase || "Não informado",
      costRisk: result.financialExposure?.costRisk || "Não informado",
      settlementRange: result.financialExposure?.settlementRange || "Não informado",
      financialRecommendation:
        result.financialExposure?.financialRecommendation ||
        "Avaliar exposição financeira com documentos adicionais.",
    },

    partnerCouncil: arr(result.partnerCouncil, 5),

    warRoom: {
      attackPlan: arr(result.warRoom?.attackPlan, 5),
      defensePlan: arr(result.warRoom?.defensePlan, 5),
      evidencePlan: arr(result.warRoom?.evidencePlan, 5),
      negotiationPlan: arr(result.warRoom?.negotiationPlan, 5),
      emergencyActions: arr(result.warRoom?.emergencyActions, 5),
    },

    caseTimeline: arr(result.caseTimeline, 8),

    tribunalDna: {
      profile: result.tribunalDna?.profile || "Perfil estimado não identificado",
      values: arr(result.tribunalDna?.values, 5),
      rejects: arr(result.tribunalDna?.rejects, 5),
      riskBehavior:
        result.tribunalDna?.riskBehavior ||
        "Comportamento estimado com base apenas no tipo de caso.",
      strategicAdvice:
        result.tribunalDna?.strategicAdvice ||
        "Adaptar linguagem, provas e pedidos ao perfil do órgão julgador.",
    },

    auditorFindings: {
      criticalRisks: arr(result.auditorFindings?.criticalRisks, 6),
      inconsistencies: arr(result.auditorFindings?.inconsistencies, 6),
      missingDocuments: arr(result.auditorFindings?.missingDocuments, 6),
      hiddenLiabilities: arr(result.auditorFindings?.hiddenLiabilities, 6),
      auditScore: clampScore(result.auditorFindings?.auditScore),
    },

    dueDiligence: {
      score: clampScore(result.dueDiligence?.score),
      riskLevel: result.dueDiligence?.riskLevel || "Médio",
      keyFindings: arr(result.dueDiligence?.keyFindings, 6),
      blockers: arr(result.dueDiligence?.blockers, 6),
      recommendation:
        result.dueDiligence?.recommendation ||
        "Recomenda-se diligência complementar antes da decisão final.",
    },

    legalCommandCenter: {
      overallRisk: result.legalCommandCenter?.overallRisk || "Médio",
      priority: result.legalCommandCenter?.priority || "Média",
      actionNow:
        result.legalCommandCenter?.actionNow ||
        "Revisar provas, riscos e próximos movimentos.",
      executiveDecision:
        result.legalCommandCenter?.executiveDecision ||
        "Decisão pendente de validação documental.",
      boardSummary:
        result.legalCommandCenter?.boardSummary ||
        "Resumo executivo indisponível.",
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const auth = await requireUser(req, corsHeaders);
  if (!auth.ok) return auth.response;

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      return Response.json(
        { error: "OPENAI_API_KEY não configurada." },
        { status: 500, headers: corsHeaders },
      );
    }

    const body = await req.json().catch(() => ({}));
    const caseText = String(body.caseText || "").trim();

    if (!caseText) {
      return Response.json(
        { error: "Texto do caso é obrigatório." },
        { status: 400, headers: corsHeaders },
      );
    }

    const prompt = `
Você é o NexJud Strategic Intelligence™, uma IA de análise jurídica estratégica para advogados brasileiros.

Sua função é ajudar o advogado a decidir se deve entrar, negociar, reforçar provas, recusar ou avançar com um caso.

NÃO dê aconselhamento jurídico definitivo.
NÃO invente jurisprudência específica.
NÃO cite números de processos, acórdãos ou decisões inexistentes.
NÃO afirme que consultou CNJ, DataJud, JusBrasil, Escavador ou tribunais.
Trabalhe com análise estratégica baseada apenas no texto fornecido.
Quando falar de jurisprudência, deixe claro que é uma predição estratégica estimada.

Caso:

${caseText}

Responda SOMENTE JSON válido, sem markdown, sem texto fora do JSON.

Regras:
- Todos os scores devem ser de 0 a 100.
- Seja específico ao caso.
- Evite respostas genéricas.
- Deal breakers devem ser fatores que podem derrubar ou enfraquecer o caso.
- Red Team deve simular a tese da parte contrária.
- Strategy Engine deve dizer exatamente o que o advogado deve fazer agora.
- Partner Decision deve ser uma das opções:
  "ACEITARIA", "RECUSARIA", "ACEITARIA COM CAUTELA", "NEGOCIARIA ACORDO"

Formato obrigatório:
{
  "title": "título curto e específico da análise",
  "executiveSummary": "resumo executivo em até 5 linhas, direto e estratégico",
  "successProbability": 0,
  "riskLevel": "Baixo | Médio | Alto",
  "complexity": "Baixa | Média | Alta",
  "financialPotential": "estimativa textual, ex: R$ 80.000 ou Não informado",

  "caseDna": {
    "provas": 0,
    "jurisprudencia": 0,
    "prescricao": 0,
    "nexo": 0,
    "danoMoral": 0
  },

  "dealBreakers": [
    "risco crítico 1",
    "risco crítico 2",
    "risco crítico 3"
  ],

  "redTeam": [
    "argumento forte que a parte contrária usaria",
    "argumento forte que a parte contrária usaria",
    "argumento forte que a parte contrária usaria"
  ],

  "strategyEngine": [
    "ação prática recomendada 1",
    "ação prática recomendada 2",
    "ação prática recomendada 3"
  ],

  "judgeDna": {
    "valoriza": ["fator 1", "fator 2", "fator 3"],
    "rejeita": ["fator 1", "fator 2", "fator 3"]
  },

  "winningThesis": "tese mais forte do advogado",
  "defenseThesis": "tese provável da parte contrária",
  "evidenceChecklist": ["prova 1", "prova 2", "prova 3"],
  "settlementRecommendation": "recomendação objetiva sobre acordo",
  "nextMoves": ["movimento 1", "movimento 2", "movimento 3"],

  "partnerDecision": "ACEITARIA | RECUSARIA | ACEITARIA COM CAUTELA | NEGOCIARIA ACORDO",
  "partnerReason": "motivo objetivo da decisão",

  "jurisprudencePrediction": {
    "favorableRate": 0,
    "trend": "Favorável | Neutra | Desfavorável",
    "favorableFactors": [
      "fundamento que tende a ajudar",
      "prova que tende a ajudar"
    ],
    "unfavorableFactors": [
      "fator que costuma enfraquecer tese",
      "risco jurisprudencial"
    ],
    "thesisStrength": "força estimada da tese diante de padrões decisórios comuns",
    "warning": "aviso de que é uma predição estratégica sem consulta externa real"
  },

  "financialExposure": {
    "bestCase": "R$ ...",
    "probableCase": "R$ ...",
    "worstCase": "R$ ...",
    "costRisk": "risco de custas, honorários, sucumbência ou impacto financeiro",
    "settlementRange": "faixa sugerida de acordo",
    "financialRecommendation": "recomendação financeira objetiva"
  },

  "partnerCouncil": [
    {
      "partner": "Sócio Conservador",
      "decision": "ACEITARIA | RECUSARIA | NEGOCIARIA | PEDIRIA MAIS PROVAS",
      "reason": "motivo"
    },
    {
      "partner": "Sócio Financeiro",
      "decision": "ACEITARIA | RECUSARIA | NEGOCIARIA | PEDIRIA MAIS PROVAS",
      "reason": "motivo"
    },
    {
      "partner": "Sócio Contencioso",
      "decision": "ACEITARIA | RECUSARIA | NEGOCIARIA | PEDIRIA MAIS PROVAS",
      "reason": "motivo"
    },
    {
      "partner": "Sócio Estratégico",
      "decision": "ACEITARIA | RECUSARIA | NEGOCIARIA | PEDIRIA MAIS PROVAS",
      "reason": "motivo"
    }
  ],

  "warRoom": {
    "attackPlan": ["como atacar a tese adversária"],
    "defensePlan": ["como defender a tese do cliente"],
    "evidencePlan": ["quais provas organizar"],
    "negotiationPlan": ["como negociar"],
    "emergencyActions": ["ações urgentes"]
  },

  "caseTimeline": [
    {
      "date": "ano/mês ou fase",
      "event": "evento relevante",
      "impact": "impacto jurídico"
    }
  ],

  "tribunalDna": {
    "profile": "Formalista | Probatório | Conciliador | Técnico | Pro consumidor | Pro empresa | Indefinido",
    "values": ["o que esse perfil tende a valorizar"],
    "rejects": ["o que esse perfil tende a rejeitar"],
    "riskBehavior": "comportamento de risco estimado",
    "strategicAdvice": "como adaptar a peça ou audiência"
  },

  "auditorFindings": {
    "criticalRisks": ["risco jurídico crítico"],
    "inconsistencies": ["inconsistência narrativa ou documental"],
    "missingDocuments": ["documento ausente"],
    "hiddenLiabilities": ["passivo ou risco oculto"],
    "auditScore": 0
  },

  "dueDiligence": {
    "score": 0,
    "riskLevel": "Baixo | Médio | Alto",
    "keyFindings": ["achado relevante"],
    "blockers": ["bloqueador da operação ou do caso"],
    "recommendation": "recomendação final de diligência"
  },

  "legalCommandCenter": {
    "overallRisk": "Baixo | Médio | Alto",
    "priority": "Baixa | Média | Alta | Crítica",
    "actionNow": "ação mais importante agora",
    "executiveDecision": "decisão executiva recomendada",
    "boardSummary": "resumo para sócio, diretoria ou cliente"
  }
}
`;

    const ai = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt,
        temperature: 0.12,
        max_output_tokens: 5200,
      }),
    });

    const json = await ai.json();

    const text =
      json.output_text ||
      json.output?.[0]?.content?.[0]?.text ||
      "";

    if (!text) {
      return Response.json(
        { error: "OpenAI não retornou texto.", raw: json },
        { status: 500, headers: corsHeaders },
      );
    }

    const clean = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(clean);
    const normalized = normalizeResult(parsed);

    return Response.json(normalized, { headers: corsHeaders });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno na análise estratégica.",
      },
      { status: 500, headers: corsHeaders },
    );
  }
});
