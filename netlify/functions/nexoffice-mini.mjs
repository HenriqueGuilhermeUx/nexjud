function env(name) {
  try { return globalThis.Netlify?.env?.get(name) || ''; } catch { return ''; }
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function clean(value, max) {
  return String(value || '').trim().replace(/\u0000/g, '').slice(0, max);
}

function bridgeKey() {
  return String(env('NEXOFFICE_MINI_KEY') || env('NEXOFFICE_INTERNAL_KEY') || '').trim();
}

function authorized(req) {
  const expected = bridgeKey();
  const provided = String(req.headers.get('x-nexoffice-key') || '').trim();
  return Boolean(expected && provided && expected === provided);
}

export function normalizeMiniRequest(body = {}) {
  const question = clean(body.question, 6000);
  const contextSummary = clean(body.contextSummary, 3000);
  const mode = body.mode === 'light_analysis' ? 'light_analysis' : 'question';
  const workspaceRef = clean(body.workspaceRef, 160);
  return { question, contextSummary, mode, workspaceRef };
}

export function buildMiniPrompt({ question, contextSummary, mode }) {
  return `
Você é o NexJud Mini, uma superfície jurídica leve incorporada ao NexOffice para empresários brasileiros.

OBJETIVO
- Explicar dúvidas jurídicas rotineiras em linguagem clara.
- Fazer análise leve de situações empresariais quando houver contexto suficiente.
- Sinalizar riscos, dados faltantes e quando a situação exige advogado/contador/especialista ou o NexJud completo.

LIMITES OBRIGATÓRIOS
- Não se apresente como advogado e não substitua aconselhamento jurídico profissional.
- Não dê parecer definitivo, garantia de resultado, probabilidade de êxito ou estratégia processual completa.
- Não invente lei, artigo, súmula, jurisprudência, processo, prazo ou órgão.
- Você NÃO possui consulta jurídica em tempo real nesta rota. Se a resposta depender de lei/regra atual, diga que deve ser confirmada em fonte oficial ou por profissional.
- Não afirme que consultou documentos, processos, jurisprudência ou bases externas que não constem no contexto enviado.
- Para prisão/criminal, medida urgente, audiência/prazo processual, demissão/conflito trabalhista sensível, disputa societária grave, autuação relevante, ação judicial existente ou alto impacto financeiro, marque escalonamento recomendado.
- Não solicite segredos, credenciais, documentos completos ou dados pessoais desnecessários.

MODO: ${mode}
CONTEXTO EMPRESARIAL OPCIONAL (fornecido pelo NexOffice; pode estar vazio):
${contextSummary || '[nenhum contexto adicional]'}

PERGUNTA:
${question}

Responda SOMENTE JSON válido neste formato:
{
  "answer": "resposta objetiva e útil em português",
  "riskLevel": "baixo | medio | alto",
  "escalationRecommended": false,
  "escalationReason": "motivo curto ou vazio",
  "missingInformation": ["informação realmente necessária"],
  "safeNextSteps": ["próximo passo prático e não definitivo"],
  "limitations": ["limitação relevante"],
  "sourceMode": "general_legal_reasoning_no_live_research"
}
`;
}

function normalizeResult(value) {
  const raw = value && typeof value === 'object' ? value : {};
  const risk = ['baixo', 'medio', 'alto'].includes(String(raw.riskLevel || '').toLowerCase()) ? String(raw.riskLevel).toLowerCase() : 'medio';
  const list = (input, limit = 6) => Array.isArray(input) ? input.map(x => clean(x, 500)).filter(Boolean).slice(0, limit) : [];
  return {
    answer: clean(raw.answer, 5000) || 'Não foi possível produzir uma resposta jurídica útil com segurança.',
    riskLevel: risk,
    escalationRecommended: raw.escalationRecommended === true || risk === 'alto',
    escalationReason: clean(raw.escalationReason, 700),
    missingInformation: list(raw.missingInformation),
    safeNextSteps: list(raw.safeNextSteps),
    limitations: list(raw.limitations),
    sourceMode: 'general_legal_reasoning_no_live_research',
  };
}

async function askOpenAI(prompt) {
  const key = env('OPENAI_API_KEY');
  if (!key) throw Object.assign(new Error('openai_not_configured'), { status: 503 });
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: env('NEXJUD_MINI_MODEL') || 'gpt-4.1-mini', input: prompt, temperature: 0.1, max_output_tokens: 1800 }),
    signal: AbortSignal.timeout(30_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(String(payload?.error?.message || `openai_http_${response.status}`)), { status: 502 });
  const text = String(payload?.output_text || payload?.output?.[0]?.content?.[0]?.text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
  if (!text) throw Object.assign(new Error('empty_ai_response'), { status: 502 });
  try { return JSON.parse(text); } catch { throw Object.assign(new Error('invalid_ai_json'), { status: 502 }); }
}

export default async (req) => {
  if (req.method !== 'POST') return json(405, { ok: false, error: 'method_not_allowed' });
  if (env('NEXOFFICE_MINI_ENABLED') !== 'true') return json(200, { ok: true, enabled: false, externalEffects: false });
  if (!authorized(req)) return json(401, { ok: false, error: 'unauthorized' });

  const input = normalizeMiniRequest(await req.json().catch(() => ({})));
  if (input.question.length < 4) return json(400, { ok: false, error: 'question_required' });

  try {
    const result = normalizeResult(await askOpenAI(buildMiniPrompt(input)));
    return json(200, {
      ok: true,
      enabled: true,
      mode: input.mode,
      workspaceRef: input.workspaceRef || null,
      ...result,
      externalEffects: false,
      dataBoundary: 'question_and_optional_summary_only',
      escalationTarget: result.escalationRecommended ? 'nexjud_or_professional' : null,
    });
  } catch (error) {
    const status = Number(error?.status || 502);
    console.error('[NexJud Mini]', error instanceof Error ? error.message : String(error));
    return json(status >= 400 && status < 600 ? status : 502, { ok: false, error: String(error?.message || 'nexjud_mini_failed') });
  }
};

export const config = { path: '/api/internal/nexoffice/mini' };
