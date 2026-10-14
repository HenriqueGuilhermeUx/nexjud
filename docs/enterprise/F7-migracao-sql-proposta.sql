-- NexJud Enterprise F7: REVIEW ONLY. NOT APPLIED.
-- Requires migration generation via Supabase CLI, staging validation and approval.
-- No changes to existing legal_cases, profiles, documents or policies.
begin;

create table if not exists public.enterprise_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 160),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.enterprise_memberships (
  organization_id uuid not null references public.enterprise_organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','legal','reviewer','reader')),
  created_at timestamptz not null default now(),
  primary key (organization_id,user_id)
);

create table if not exists public.enterprise_import_batches (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.enterprise_organizations(id),
  idempotency_key text not null check (length(btrim(idempotency_key)) between 1 and 128),
  fingerprint text not null check (fingerprint ~ '^sha256:[a-f0-9]{64}$'),
  actor_id uuid not null references auth.users(id),
  receipt jsonb not null,
  created_at timestamptz not null default now(),
  unique (organization_id,idempotency_key),
  unique (id,organization_id)
);

create table if not exists public.enterprise_import_items (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null,
  organization_id uuid not null,
  external_id text not null,
  source_system text not null,
  cnj_digits text not null check (cnj_digits ~ '^[0-9]{20}$'),
  created_at timestamptz not null default now(),
  foreign key (batch_id,organization_id) references public.enterprise_import_batches(id,organization_id),
  unique (batch_id,source_system,external_id)
);

create table if not exists public.enterprise_import_audit (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null,
  organization_id uuid not null,
  actor_id uuid not null references auth.users(id),
  action text not null check (action in ('import_created','import_replayed','import_conflict')),
  created_at timestamptz not null default now(),
  foreign key (batch_id,organization_id) references public.enterprise_import_batches(id,organization_id)
);

create index if not exists enterprise_memberships_user_idx on public.enterprise_memberships(user_id);
create index if not exists enterprise_import_items_org_idx on public.enterprise_import_items(organization_id);
create index if not exists enterprise_import_audit_org_idx on public.enterprise_import_audit(organization_id);

alter table public.enterprise_organizations enable row level security;
alter table public.enterprise_memberships enable row level security;
alter table public.enterprise_import_batches enable row level security;
alter table public.enterprise_import_items enable row level security;
alter table public.enterprise_import_audit enable row level security;

-- Intentionally NO policies and NO GRANT to anon/authenticated.
-- Deny by default. A future verified server-side transaction must enforce
-- organization membership, permission, idempotency, and audit atomically.
-- Never expose service_role to the browser.
commit;
