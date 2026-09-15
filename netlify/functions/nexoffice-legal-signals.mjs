import { createHash } from 'node:crypto';
import { resolveNexOfficeIdentity } from './nexoffice-handoff.mjs';

function env(name) {
  try { return globalThis.Netlify?.env?.get(name) || ''; } catch { return ''; }
}

function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function bearer(req) {
  const authorization = req.headers.get('authorization') || '';
  if (!authorization.startsWith('Bearer ')) return '';
  return authorization.slice(7).trim();
}

async function authenticatedUser(req) {
  const token = bearer(req);
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
    return user?.id && user?.email ? { user, token } : null;
  } catch {
    return null;
  }
}

async function nexoffice(path, body) {
  const baseUrl = env('NEXOFFICE_BASE_URL').replace(/\/$/, '');
  const internalKey = env('NEXOFFICE_INTERNAL_KEY');
  if (!baseUrl || !internalKey) {
    const error = new Error('nexoffice_not_configured');
    error.status = 503;
    throw error;
  }
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      'x-nexoffice-key': internalKey,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(String(payload?.message || payload?.error || `NexOffice HTTP ${response.status}`));
    error.status = response.status;
    error.code = payload?.error;
    throw error;
  }
  return payload;
}

function clean(value, max = 220) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text ? text.slice(0, max) : '';
}

function displayName(user) {
  const metadata = user?.user_metadata || {};
  return String(metadata.full_name || metadata.name || metadata.display_name || user.email?.split('@')[0] || 'Usuário NexJud').slice(0, 160);
}

function businessName(user, identity) {
  const trusted = user?.app_metadata || {};
  const metadata = user?.user_metadata || {};
  const trustedName = clean(trusted.nexoffice_workspace_name || trusted.organization_name || trusted.office_name || trusted.firm_name, 180);
  if (identity?.sharedWorkspace && trustedName) return trustedName;
  return String(metadata.office_name || metadata.company_name || metadata.organization_name || metadata.firm_name || displayName(user)).slice(0, 180);
}

function countFromRange(value) {
  const total = String(value || '').split('/').pop();
  const parsed = Number(total);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : 0;
}

async function countRows({ table, userId, token, since, optional = false }) {
  const supabaseUrl = env('VITE_SUPABASE_URL').replace(/\/$/, '');
  const anonKey = env('VITE_SUPABASE_ANON_KEY');
  const query = new URLSearchParams({ select: 'id', user_id: `eq.${userId}`, created_at: `gte.${since}` });
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/${encodeURIComponent(table)}?${query.toString()}`, {
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${token}`,
        prefer: 'count=exact',
        range: '0-0',
      },
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      if (optional && (response.status === 404 || response.status === 400)) return 0;
      throw new Error(`supabase_count_${table}_${response.status}`);
    }
    return countFromRange(response.headers.get('content-range'));
  } catch (error) {
    if (optional) return 0;
    throw error;
  }
}

export function buildLegalActivitySignal({ identity, counts, now = new Date() }) {
  const periodEnd = now.toISOString();
  const periodStart = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const memberKey = createHash('sha256').update(String(identity.externalUserSubject)).digest('hex').slice(0, 16);
  const day = periodEnd.slice(0, 10);
  return {
    sourceProduct: 'nexjud',
    externalWorkspaceRef: identity.externalWorkspaceRef,
    correlationId: `nexjud-activity-${day}-${memberKey}`,
    signalType: 'activity.summary',
    periodStart,
    periodEnd,
    dimensions: { window: 'day', scope: identity.sharedWorkspace ? 'member' : 'workspace' },
    metrics: {
      strategicAnalyses: Number(counts.strategicAnalyses || 0),
      drafts: Number(counts.drafts || 0),
      judgeSessions: Number(counts.judgeSessions || 0),
      agentRuns: Number(counts.agentRuns || 0),
    },
  };
}

export default async (req) => {
  if (req.method !== 'POST') return json(405, { ok: false, error: 'method_not_allowed' });
  if (env('NEXOFFICE_LEGAL_SIGNALS_ENABLED') !== 'true') {
    return json(200, { ok: true, enabled: false, synced: false, privacy: 'aggregate_only' });
  }

  const auth = await authenticatedUser(req);
  if (!auth) return json(401, { ok: false, error: 'unauthorized' });
  const { user, token } = auth;
  const identity = resolveNexOfficeIdentity(user);
  if (!identity.externalWorkspaceRef || !identity.externalUserSubject) return json(422, { ok: false, error: 'invalid_federated_identity' });

  try {
    await nexoffice('/v1/platform/provision', {
      sourceProduct: 'nexjud',
      externalWorkspaceRef: identity.externalWorkspaceRef,
      businessName: businessName(user, identity),
      vertical: 'legal',
      ownerEmail: String(user.email).toLowerCase(),
      ownerName: displayName(user),
      memberRole: identity.memberRole,
      externalUserSubject: identity.externalUserSubject,
      entitlements: ['addon.nexjud'],
    });

    const now = new Date();
    const since = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const [strategicAnalyses, drafts, judgeSessions, agentRuns] = await Promise.all([
      countRows({ table: 'strategic_analyses', userId: user.id, token, since }),
      countRows({ table: 'drafts', userId: user.id, token, since }),
      countRows({ table: 'judge_sessions', userId: user.id, token, since }),
      countRows({ table: 'legal_agent_runs', userId: user.id, token, since, optional: true }),
    ]);

    const signal = buildLegalActivitySignal({ identity, counts: { strategicAnalyses, drafts, judgeSessions, agentRuns }, now });
    const result = await nexoffice('/v1/platform/legal-signals', signal);
    return json(200, {
      ok: true,
      enabled: true,
      synced: true,
      privacy: 'aggregate_only',
      signalType: signal.signalType,
      periodStart: signal.periodStart,
      periodEnd: signal.periodEnd,
      scope: signal.dimensions.scope,
      metrics: signal.metrics,
      nexofficeSignalId: result?.signal?.id || null,
    });
  } catch (error) {
    const status = Number(error?.status || 502);
    const code = error?.code || error?.message || 'legal_signal_sync_failed';
    console.error('[NexJud NexOffice Legal Signals]', String(code));
    return json(status >= 400 && status < 600 ? status : 502, { ok: false, error: String(code) });
  }
};

export const config = { path: '/api/nexoffice/legal-signals' };
