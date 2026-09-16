function env(name) {
  try { return globalThis.Netlify?.env?.get(name) || ''; } catch { return ''; }
}

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
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
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, { headers: { apikey: anonKey, authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8_000) });
    if (!response.ok) return null;
    const user = await response.json();
    return user?.id && user?.email ? user : null;
  } catch { return null; }
}

export default async (req) => {
  if (req.method !== 'GET') return json(405, { ok: false, error: 'method_not_allowed' });
  const user = await authenticatedUser(req);
  if (!user) return json(401, { ok: false, error: 'unauthorized' });

  const baseUrl = env('NEXOFFICE_BASE_URL').replace(/\/$/, '');
  const internalKey = env('NEXOFFICE_INTERNAL_KEY');
  const integrationEnabled = env('NEXOFFICE_INTEGRATION_ENABLED') === 'true';
  const externalEffects = env('NEXOFFICE_EXTERNAL_EFFECTS_ENABLED') === 'true';
  const configured = Boolean(baseUrl && internalKey);
  if (!configured || !integrationEnabled) {
    return json(200, { ok: true, configured, reachable: false, integrationEnabled, featureEnabled: env('VITE_NEXOFFICE_ENABLED') === 'true', legalSignalsEnabled: env('NEXOFFICE_LEGAL_SIGNALS_ENABLED') === 'true', externalEffects, capabilities: [] });
  }

  try {
    const response = await fetch(`${baseUrl}/v1/platform/health`, { headers: { accept: 'application/json', 'x-nexoffice-key': internalKey }, signal: AbortSignal.timeout(8_000) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return json(502, { ok: false, configured: true, reachable: false, integrationEnabled, externalEffects, error: 'nexoffice_health_failed', upstreamStatus: response.status });
    return json(200, {
      ok: true, configured: true, reachable: true, integrationEnabled,
      featureEnabled: env('VITE_NEXOFFICE_ENABLED') === 'true',
      legalSignalsEnabled: env('NEXOFFICE_LEGAL_SIGNALS_ENABLED') === 'true',
      service: String(payload?.service || 'nexoffice-platform'),
      capabilities: Array.isArray(payload?.capabilities) ? payload.capabilities : [],
      externalEffects: externalEffects && payload?.externalEffects === true,
      upstreamExternalEffects: payload?.externalEffects === true,
    });
  } catch (error) {
    console.error('[NexJud NexOffice Health]', error instanceof Error ? error.message : String(error));
    return json(502, { ok: false, configured: true, reachable: false, integrationEnabled, externalEffects, error: 'nexoffice_unreachable' });
  }
};

export const config = { path: '/api/nexoffice/health' };
