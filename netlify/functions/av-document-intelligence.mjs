function env(name) {
  try { return globalThis.Netlify?.env?.get(name) || ''; } catch { return ''; }
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

async function authenticatedUser(req) {
  const authorization = req.headers.get('authorization') || '';
  if (!authorization.startsWith('Bearer ')) return null;
  const token = authorization.slice(7).trim();
  if (!token) return null;
  const supabaseUrl = env('VITE_SUPABASE_URL');
  const anonKey = env('VITE_SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) return null;
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return null;
    const user = await response.json();
    return user?.id ? user : null;
  } catch {
    return null;
  }
}

const TYPE_MAP = {
  peticao: 'legal_document',
  contrato: 'contract',
  sentenca: 'legal_document',
  acordao: 'legal_document',
  parecer: 'legal_document',
  prova: 'legal_document',
  procuracao: 'power_of_attorney',
  societario: 'corporate_document',
  geral: 'auto',
};

export default async (req) => {
  if (req.method !== 'POST') return json(405, { ok: false, error: 'method_not_allowed' });
  const user = await authenticatedUser(req);
  if (!user) return json(401, { ok: false, error: 'unauthorized' });

  const serviceKey = env('AV_DOCUMENT_INTELLIGENCE_KEY');
  const upstreamUrl = env('AV_DOCUMENT_INTELLIGENCE_URL') || 'https://alternativeventures.com.br/api/document-intelligence/extract';
  if (!serviceKey) return json(503, { ok: false, error: 'document_intelligence_not_configured' });

  let body;
  try { body = await req.json(); } catch { return json(400, { ok: false, error: 'invalid_json' }); }
  const text = String(body?.text || '').trim();
  if (!text) return json(422, { ok: false, error: 'text_required' });
  if (text.length > 750_000) return json(413, { ok: false, error: 'document_text_too_large' });

  const requested = String(body?.documentType || 'auto');
  const documentType = TYPE_MAP[requested] || requested || 'auto';

  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-av-document-key': serviceKey },
      body: JSON.stringify({
        consumer: 'nexjud',
        provider: 'internal',
        documentType,
        text,
        file: {
          name: body?.file?.name || 'documento',
          mimeType: body?.file?.mimeType || 'text/plain',
          pages: Number(body?.file?.pages || 1),
        },
      }),
      signal: AbortSignal.timeout(18_000),
    });
    const payload = await upstream.json().catch(() => null);
    if (!upstream.ok || !payload) return json(502, { ok: false, error: 'upstream_failed' });
    return json(upstream.status, payload);
  } catch (error) {
    console.error('[NexJud AV Document Intelligence]', error instanceof Error ? error.message : error);
    return json(502, { ok: false, error: 'document_intelligence_unavailable' });
  }
};

export const config = { path: '/api/av-document-intelligence' };
