-- STAGING ONLY: disposable approximation of verified legacy legal_cases columns,
-- plus proposed PRIVATE enterprise-to-legacy link. NEVER APPLY THIS FILE TO PRODUCTION.
begin;
create table public.legal_cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  title text not null,
  process_number text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
alter table public.legal_cases enable row level security;
revoke all on public.legal_cases from public, anon, authenticated;
create policy enterprise_fixture_owner_read on public.legal_cases
  for select to authenticated using (user_id=auth.uid());
create policy enterprise_fixture_owner_delete on public.legal_cases
  for delete to authenticated using (user_id=auth.uid());
grant select, delete on public.legal_cases to authenticated;

create table public.enterprise_case_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.enterprise_organizations(id),
  -- Case links must not block the legacy owner's normal delete action.
  case_id uuid not null references public.legal_cases(id) on delete cascade,
  batch_id uuid not null,
  actor_id uuid not null references auth.users(id),
  source_system text not null,
  external_id text not null,
  created_at timestamptz not null default now(),
  foreign key (batch_id,organization_id)
    references public.enterprise_import_batches(id,organization_id),
  unique (organization_id,source_system,external_id),
  unique (organization_id,case_id)
);
create index enterprise_case_links_batch_idx on public.enterprise_case_links(batch_id);
alter table public.enterprise_case_links enable row level security;
revoke all on public.enterprise_case_links from public, anon, authenticated;
-- Intentionally no browser read policy: membership alone does not grant
-- access to a case owned by a different user.
commit;
