// Repassa consultas à API pública do DataJud a partir da rede da Netlify.
//
// Por quê: o DataJud passou a limitar (HTTP 429) ou deixar sem resposta as chamadas
// que saem das Edge Functions do Supabase. As funções do Supabase chamam este proxy
// primeiro e, se ele falhar, chamam o DataJud direto.
//
// Segurança:
// - só aceita POST com o header x-nexjud-proxy-secret igual a DATAJUD_PROXY_SECRET
//   (variável de ambiente da Netlify; o mesmo valor fica no Vault do Supabase);
// - só fala com api-publica.datajud.cnj.jus.br e só com aliases de TJ/TRF/TRT;
// - a chave do DataJud vem no header x-datajud-authorization, enviada pela Edge Function.
import { timingSafeEqual } from 'node:crypto';

const ALIAS = /^(tj[a-z]{2,4}|trf[1-6]|trt(?:[1-9]|1[0-9]|2[0-4]))$/;
const TIMEOUT_MS = 20_000;

function env(name) {
  try { return globalThis.Netlify?.env?.get(name) || process.env[name] || ''; } catch { return ''; }
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function sameSecret(given, expected) {
  const a = Buffer.from(String(given || ''));
  const b = Buffer.from(String(expected || ''));
  return a.length > 0 && a.length === b.length && timingSafeEqual(a, b);
}

async function callDatajud(alias, query, authorization) {
  // CNJ 429 is authoritative: never retry automatically.
  return fetch(`https://api-publica.datajud.cnj.jus.br/api_publica_${alias}/_search`, {
    method: 'POST',
    headers: { Authorization: authorization, 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
}

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const secret = env('DATAJUD_PROXY_SECRET');
  if (!secret) return json(503, { error: 'proxy_not_configured' });
  if (!sameSecret(req.headers.get('x-nexjud-proxy-secret'), secret)) return json(401, { error: 'unauthorized' });

  const authorization = req.headers.get('x-datajud-authorization') || '';
  if (!authorization) return json(400, { error: 'missing_datajud_authorization' });

  let body;
  try { body = await req.json(); } catch { return json(400, { error: 'invalid_json' }); }
  const alias = String(body?.alias || '');
  if (!ALIAS.test(alias)) return json(400, { error: 'invalid_alias' });
  if (!body?.query || typeof body.query !== 'object') return json(400, { error: 'invalid_query' });

  const started = Date.now();
  try {
    const response = await callDatajud(alias, body.query, authorization);
    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: {
        'content-type': response.headers.get('content-type') || 'application/json',
        'cache-control': 'no-store',
        'x-datajud-elapsed-ms': String(Date.now() - started),
        'x-datajud-via': 'netlify',
      },
    });
  } catch (error) {
    const timedOut = error?.name === 'TimeoutError';
    return new Response(JSON.stringify({ error: timedOut ? 'datajud_timeout' : 'datajud_unreachable', elapsedMs: Date.now() - started }), {
      status: timedOut ? 504 : 502,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-datajud-via': 'netlify' },
    });
  }
};

export const config = { path: '/api/datajud-proxy' };
