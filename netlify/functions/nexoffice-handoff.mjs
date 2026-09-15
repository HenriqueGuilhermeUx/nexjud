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
    return user?.id && user?.email ? user : null;
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

function firstTrusted(metadata, keys) {
  for (const key of keys) {
    const value = clean(metadata?.[key]);
    if (value) return value;
  }
  return '';
}

function normalizeRole(value) {
  const role = clean(value, 40).toLowerCase();
  return ['owner', 'admin', 'member', 'viewer'].includes(role) ? role : '';
}

export function resolveNexOfficeIdentity(user) {
  const app = user?.app_metadata || {};
  const externalWorkspaceRef = firstTrusted(app, [
    'nexoffice_workspace_ref',
    'organization_id',
    'organizationId',
    'office_id',
    'officeId',
    'firm_id',
    'firmId',
    'tenant_id',
    'tenantId',
  ]) || clean(user?.id);
  const memberRole = normalizeRole(firstTrusted(app, [
    'nexoffice_role',
    'organization_role',
    'organizationRole',
    'office_role',
    'officeRole',
  ])) || 'owner';
  return {
    externalWorkspaceRef,
    externalUserSubject: clean(user?.id),
    memberRole,
    sharedWorkspace: externalWorkspaceRef !== clean(user?.id),
  };
}

function displayName(user) {
  const metadata = user?.user_metadata || {};
  return String(metadata.full_name || metadata.name || metadata.display_name || user.email?.split('@')[0] || 'Usuário NexJud').slice(0, 160);
}

function businessName(user, identity) {
  const trusted = user?.app_metadata || {};
  const metadata = user?.user_metadata || {};
  const trustedName = firstTrusted(trusted, ['nexoffice_workspace_name', 'organization_name', 'office_name', 'firm_name']);
  if (identity?.sharedWorkspace && trustedName) return trustedName.slice(0, 180);
  return String(metadata.office_name || metadata.company_name || metadata.organization_name || metadata.firm_name || displayName(user)).slice(0, 180);
}

export default async (req) => {
  if (req.method !== 'POST') return json(405, { ok: false, error: 'method_not_allowed' });

  const user = await authenticatedUser(req);
  if (!user) return json(401, { ok: false, error: 'unauthorized' });

  const identity = resolveNexOfficeIdentity(user);
  if (!identity.externalWorkspaceRef || !identity.externalUserSubject) return json(422, { ok: false, error: 'invalid_federated_identity' });

  const access = {
    sourceProduct: 'nexjud',
    externalWorkspaceRef: identity.externalWorkspaceRef,
    externalUserSubject: identity.externalUserSubject,
    email: String(user.email).toLowerCase(),
  };

  try {
    await nexoffice('/v1/platform/provision', {
      sourceProduct: access.sourceProduct,
      externalWorkspaceRef: access.externalWorkspaceRef,
      businessName: businessName(user, identity),
      vertical: 'legal',
      ownerEmail: access.email,
      ownerName: displayName(user),
      memberRole: identity.memberRole,
      externalUserSubject: access.externalUserSubject,
      entitlements: ['addon.nexjud'],
    });

    const handoff = await nexoffice('/v1/platform/handoff', access);
    if (!handoff?.url || !handoff?.expiresAt) return json(502, { ok: false, error: 'invalid_nexoffice_handoff' });

    return json(200, {
      ok: true,
      url: handoff.url,
      expiresAt: handoff.expiresAt,
      vertical: 'legal',
      sharedWorkspace: identity.sharedWorkspace,
    });
  } catch (error) {
    const status = Number(error?.status || 502);
    const code = error?.code || error?.message || 'nexoffice_unavailable';
    console.error('[NexJud NexOffice Handoff]', code);
    return json(status >= 400 && status < 600 ? status : 502, { ok: false, error: String(code) });
  }
};

export const config = { path: '/api/nexoffice/handoff' };