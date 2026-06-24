import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function clampScore(value: any) {
  const n = Number(value || 0);
  if (n <= 10 && n > 0) return Math.round(n * 10);
  if (n > 100) return 100;
  if (n < 0) return 0;
  return Math.round(n);
}

function arr(value: any, limit = 6) {
  return Array.isArray(value) ? value.slice(0, limit) : [];
}

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

    oneClickActions: arr(result.oneClickActions, 8),

    dealEconomics: {
      estimatedFees: result.dealEconomics?.estimatedFees || "Não informado",
      expectedValue: result.dealEconomics?.expectedValue || "Não informado",
      estimatedHours: result.dealEconomics?.estimatedHours || "Não informado",
      hourlyReturn: result.dealEconomics?.hourlyReturn || "Não informado",
      recommendation: result.dealEconomics?.recommendation || "AVALIAR",
      reason:
        result.dealEconomics?.reason ||
        "Economia do caso depende de valor, complexidade, provas e tempo estimado.",
    },

    clientRisk: {
      score: clampScore(result.clientRisk?.score),
      level: result.clientRisk?.level || "MÉDIO",
      findings: arr(result.clientRisk?.findings, 6),
      recommendation:
        result.clientRisk?.recommendation ||
        "Alinhar expectativas e documentar premissas antes de avançar.",
    },

    opponentIntelligence: {
      profile: result.opponentIntelligence?.profile || "Adversário não identificado",
      settlementChance: result.opponentIntelligence?.settlementChance || "Não informado",
      commonTactics: arr(result.opponentIntelligence?.commonTactics, 6),
      expectedDefense: arr(result.opponentIntelligence?.expectedDefense, 6),
      pressurePoints: arr(result.opponentIntelligence?.pressurePoints, 6),
    },

    boardReport: {
      decision: result.boardReport?.decision || "AVALIAR",
      risk: result.boardReport?.risk || "Médio",
      financialImpact: result.boardReport?.financialImpact || "Não informado",
      executiveSummary:
        result.boardReport?.executiveSummary ||
        "Resumo executivo para cliente/diretoria indisponível.",
      recommendation:
        result.boardReport?.recommendation ||
        "Validar documentos e estratégia antes da decisão final.",
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

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
- Partner Decision deve ser uma das opções:
  "ACEITARIA", "RECUSARIA", "ACEITARIA COM CAUTELA", "NEGOCIARIA ACORDO".

Formato obrigatório:
{
  "title": "título curto e específico da análise",
  "executiveSummary": "resumo executivo em até 5 linhas",
  "successProbability": 0,
  "riskLevel": "Baixo | Médio | Alto",
  "complexity": "Baixa | Média | Alta",
  "financialPotential": "estimativa textual",

  "caseDna": {
    "provas": 0,
    "jurisprudencia": 0,
    "prescricao": 0,
    "nexo": 0,
    "danoMoral": 0
  },

  "dealBreakers": ["risco crítico"],
  "redTeam": ["argumento da parte contrária"],
  "strategyEngine": ["ação prática"],
  "judgeDna": {
    "valoriza": ["fator"],
    "rejeita": ["fator"]
  },
  "winningThesis": "tese mais forte",
  "defenseThesis": "tese adversária provável",
  "evidenceChecklist": ["prova"],
  "settlementRecommendation": "recomendação de acordo",
  "nextMoves": ["próximo movimento"],
  "partnerDecision": "ACEITARIA | RECUSARIA | ACEITARIA COM CAUTELA | NEGOCIARIA ACORDO",
  "partnerReason": "motivo",

  "jurisprudencePrediction": {
    "favorableRate": 0,
    "trend": "Favorável | Neutra | Desfavorável",
    "favorableFactors": ["fator favorável"],
    "unfavorableFactors": ["fator desfavorável"],
    "thesisStrength": "força estimada da tese",
    "warning": "aviso de predição sem consulta externa real"
  },

  "financialExposure": {
    "bestCase": "R$ ...",
    "probableCase": "R$ ...",
    "worstCase": "R$ ...",
    "costRisk": "risco financeiro",
    "settlementRange": "faixa de acordo",
    "financialRecommendation": "recomendação financeira"
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
    "attackPlan": ["como atacar"],
    "defensePlan": ["como defender"],
    "evidencePlan": ["provas"],
    "negotiationPlan": ["negociação"],
    "emergencyActions": ["urgente"]
  },

  "caseTimeline": [
    {
      "date": "ano/mês ou fase",
      "event": "evento",
      "impact": "impacto"
    }
  ],

  "tribunalDna": {
    "profile": "Formalista | Probatório | Conciliador | Técnico | Pro consumidor | Pro empresa | Indefinido",
    "values": ["valoriza"],
    "rejects": ["rejeita"],
    "riskBehavior": "comportamento",
    "strategicAdvice": "orientação"
  },

  "auditorFindings": {
    "criticalRisks": ["risco"],
    "inconsistencies": ["inconsistência"],
    "missingDocuments": ["documento ausente"],
    "hiddenLiabilities": ["passivo oculto"],
    "auditScore": 0
  },

  "dueDiligence": {
    "score": 0,
    "riskLevel": "Baixo | Médio | Alto",
    "keyFindings": ["achado"],
    "blockers": ["bloqueador"],
    "recommendation": "recomendação"
  },

  "legalCommandCenter": {
    "overallRisk": "Baixo | Médio | Alto",
    "priority": "Baixa | Média | Alta | Crítica",
    "actionNow": "ação agora",
    "executiveDecision": "decisão executiva",
    "boardSummary": "resumo para cliente/diretoria"
  },

  "oneClickActions": [
    {
      "label": "Gerar minuta",
      "action": "draft",
      "context": "contexto do que deve ser gerado"
    },
    {
      "label": "Simular acordo",
      "action": "settlement",
      "context": "contexto para simulação"
    },
    {
      "label": "Treinar audiência",
      "action": "judge",
      "context": "contexto para juiz simulado"
    }
  ],

  "dealEconomics": {
    "estimatedFees": "R$ ...",
    "expectedValue": "R$ ...",
    "estimatedHours": "número ou faixa",
    "hourlyReturn": "R$ .../h",
    "recommendation": "ACEITAR | RECUSAR | NEGOCIAR | PEDIR MAIS DADOS",
    "reason": "motivo econômico"
  },

  "clientRisk": {
    "score": 0,
    "level": "BAIXO | MÉDIO | ALTO",
    "findings": ["risco comportamental ou documental do cliente"],
    "recommendation": "como reduzir risco do cliente"
  },

  "opponentIntelligence": {
    "profile": "perfil do adversário",
    "settlementChance": "percentual ou texto",
    "commonTactics": ["tática comum"],
    "expectedDefense": ["defesa esperada"],
    "pressurePoints": ["ponto de pressão"]
  },

  "boardReport": {
    "decision": "ACEITAR | RECUSAR | NEGOCIAR | PEDIR MAIS DADOS",
    "risk": "Baixo | Médio | Alto",
    "financialImpact": "impacto financeiro resumido",
    "executiveSummary": "resumo de uma página para cliente/diretoria",
    "recommendation": "recomendação executiva final"
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
        max_output_tokens: 6200,
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
