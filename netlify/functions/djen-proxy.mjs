// Repassa consultas à API pública do DJEN (comunicaapi.pje.jus.br) a partir da rede da Netlify.
// Só é usado se a chamada direta das Edge Functions do Supabase for recusada.
//
// Segurança:
// - só aceita POST com x-nexjud-proxy-secret igual a DJEN_PROXY_SECRET (Netlify e Supabase);
// - só fala com comunicaapi.pje.jus.br/api/v1/comunicacao;
// - só repassa os filtros conhecidos, com formato validado;
// - nunca repete após HTTP 429 do CNJ.
import { timingSafeEqual } from 'node:crypto';

const TIMEOUT_MS = 15_000;
const ALLOWED = {
  numeroProcesso: /^\d{20}$/,
  siglaTribunal: /^[A-Z0-9]{2,8}$/,
  nomeOrgao: /^[\p{L}\p{N} ºª°.,\-–/()]{3,160}$/u,
  dataDisponibilizacaoInicio: /^\d{4}-\d{2}-\d{2}$/,
  dataDisponibilizacaoFim: /^\d{4}-\d{2}-\d{2}$/,
  pagina: /^\d{1,3}$/,
  itensPorPagina: /^(?:[1-9]|[1-9]\d|100)$/,
};

function env(name) {
  try { return globalThis.Netlify?.env?.get(name) || process.env[name] || ''; } catch { return ''; }
}

function json(status, body, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
  });
}

function sameSecret(given, expected) {
  const a = Buffer.from(String(given || ''));
  const b = Buffer.from(String(expected || ''));
  return a.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const secret = env('DJEN_PROXY_SECRET');
  if (!secret) return json(503, { error: 'proxy_not_configured' });
  if (!sameSecret(req.headers.get('x-nexjud-proxy-secret'), secret)) return json(401, { error: 'unauthorized' });

  let body;
  try { body = await req.json(); } catch { return json(400, { error: 'invalid_json' }); }
  const params = body?.params && typeof body.params === 'object' ? body.params : {};
  const url = new URL('https://comunicaapi.pje.jus.br/api/v1/comunicacao');
  for (const [key, value] of Object.entries(params)) {
    const rule = ALLOWED[key];
    if (!rule || typeof value !== 'string' || !rule.test(value)) return json(400, { error: 'invalid_param', param: key });
    url.searchParams.set(key, value);
  }
  if (!url.searchParams.get('numeroProcesso') && !url.searchParams.get('siglaTribunal')) {
    return json(400, { error: 'missing_filter' });
  }

  try {
    const upstream = await fetch(url, {
      headers: { Accept: 'application/json', 'User-Agent': 'NexJud/1.0 (consulta sob demanda)' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      redirect: 'error',
    });
    const text = await upstream.text();
    if (text.length > 5_000_000) return json(502, { error: 'response_too_large' }, { 'x-djen-via': 'netlify' });
    return new Response(text, {
      status: upstream.status,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-djen-via': 'netlify' },
    });
  } catch (error) {
    const timedOut = error?.name === 'TimeoutError';
    return json(timedOut ? 504 : 502, { error: timedOut ? 'djen_timeout' : 'djen_unreachable' }, { 'x-djen-via': 'netlify' });
  }
};

export const config = { path: '/api/djen-proxy' };
