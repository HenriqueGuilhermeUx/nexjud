-- STAGING ONLY: disposable approximation of verified legacy legal_cases columns,
-- standalone legacy-case fixture. Private link-table DDL lives in F46. NEVER APPLY THIS FILE TO PRODUCTION.
begin;
create table public.legal_cases (
  -- Matches the verified column names, types and defaults of the current
  -- NexJud legacy legal_cases catalog; no actual customer data is copied.
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  client_name text,
  process_number text,
  opponent_name text,
  court text,
  status text default 'active',
  summary text,
  risk_level text,
  success_probability integer default 0,
  tags text[] default '{}'::text[],
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.legal_cases enable row level security;
revoke all on public.legal_cases from public, anon, authenticated;
create policy enterprise_fixture_owner_read on public.legal_cases
  for select to authenticated using (user_id=auth.uid());
create policy enterprise_fixture_owner_delete on public.legal_cases
  for delete to authenticated using (user_id=auth.uid());
grant select, delete on public.legal_cases to authenticated;

-- Link-table DDL moved to F46-tenant-case-links-staging.sql and is
-- intentionally tested against this disposable legacy-case fixture.
commit;
