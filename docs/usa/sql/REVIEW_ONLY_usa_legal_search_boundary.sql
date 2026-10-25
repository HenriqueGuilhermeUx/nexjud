-- ALTERNATIVE VENTURES USA — REVIEW-ONLY DRAFT, NEVER APPLIED AUTOMATICALLY
-- File deliberately outside supabase/migrations. USE ONLY ON A NEW US-ONLY
-- Supabase project after security review, separate accounts/secrets and grants.
-- This is not an instruction to modify NexJud Brazil or any existing database.
--
-- Provides exactly the public table names + RPC referenced by the USA-only
-- Edge draft. No billing/payments or existing schema objects are touched.
-- Requires: authenticated US users only. No default tenant or quota seed.
-- Do not execute against a Brazilian project. NO automated deployment.

begin;

-- An additional deliberate operational safety interlock. The reviewer must
-- authorize the NEW isolated US session first using
-- SET LOCAL app.alternative_ventures_usa = 'ISOLATED_US_APPROVED';
-- The default is to RAISE an exception and roll back without any DDL.
do $usa_guard$
begin
  if current_setting('app.alternative_ventures_usa', true)
      is distinct from 'ISOLATED_US_APPROVED' then
    raise exception 'USA migration draft is DISARMED; do not run on a Brazilian environment';
  end if;
end
$usa_guard$;

create table if not exists public.usa_legal_tenants (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(display_name) between 1 and 120),
  status text not null default 'inactive' check (status in ('inactive','active','suspended')),
  created_at timestamptz not null default now()
);

create table if not exists public.usa_legal_memberships (
  tenant_id uuid not null references public.usa_legal_tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('lawyer','firm_admin','researcher','other')),
  status text not null default 'inactive' check (status in ('inactive','active','revoked')),
  created_at timestamptz not null default now(),
  primary key (tenant_id,user_id)
);
create index if not exists usa_legal_memberships_user_idx on public.usa_legal_memberships(user_id);

create table if not exists public.usa_legal_research_entitlements (
  tenant_id uuid primary key references public.usa_legal_tenants(id) on delete cascade,
  enabled boolean not null default false,
  valid_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.usa_legal_search_quotas (
  tenant_id uuid not null references public.usa_legal_tenants(id) on delete cascade,
  window_date date not null,
  remaining integer not null check (remaining >= 0),
  updated_at timestamptz not null default now(),
  primary key (tenant_id,window_date)
);

alter table public.usa_legal_tenants enable row level security;
alter table public.usa_legal_memberships enable row level security;
alter table public.usa_legal_research_entitlements enable row level security;
alter table public.usa_legal_search_quotas enable row level security;

-- No broad grants. Readers only see their *own* memberships and tenant's
-- entitlement. Other tables have NO public/anon/authenticated read policies.
revoke all on public.usa_legal_tenants from public, anon, authenticated;
revoke all on public.usa_legal_memberships from public, anon, authenticated;
revoke all on public.usa_legal_research_entitlements from public, anon, authenticated;
revoke all on public.usa_legal_search_quotas from public, anon, authenticated;
grant select on public.usa_legal_memberships to authenticated;
grant select on public.usa_legal_research_entitlements to authenticated;

drop policy if exists usa_legal_membership_self_select on public.usa_legal_memberships;
create policy usa_legal_membership_self_select
  on public.usa_legal_memberships for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists usa_legal_entitlement_member_select on public.usa_legal_research_entitlements;
create policy usa_legal_entitlement_member_select
  on public.usa_legal_research_entitlements for select to authenticated
  using (exists (
    select 1 from public.usa_legal_memberships m
    where m.tenant_id = usa_legal_research_entitlements.tenant_id
      and m.user_id = (select auth.uid()) and m.status = 'active'
  ));

-- Vetted privileged function: intentionally SECURITY DEFINER to mutate a
-- quota counter unavailable for direct client writes. Restrict EXECUTE below,
-- never accept an unverified user_id; re-check membership internally.
create or replace function public.usa_legal_search_consume_quota(p_tenant_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null or p_tenant_id is null then return false; end if;
  if coalesce(auth.jwt()->>'is_anonymous', 'false') = 'true' then return false; end if;
  if not exists (
    select 1 from public.usa_legal_memberships m
    join public.usa_legal_tenants t on t.id = m.tenant_id
    join public.usa_legal_research_entitlements e on e.tenant_id = m.tenant_id
    where m.tenant_id = p_tenant_id and m.user_id = v_uid
      and m.status = 'active'
      and m.role in ('lawyer','firm_admin','researcher')
      and t.status = 'active'
      and e.enabled is true and (e.valid_until is null or e.valid_until > now())
  ) then return false; end if;

  -- Single transactional UPDATE provides atomic count decrement under
  -- concurrency. Absent quota row or exhausted quota => false.
  update public.usa_legal_search_quotas q
  set remaining = remaining - 1, updated_at = now()
  where q.tenant_id = p_tenant_id
    and q.window_date = (now() at time zone 'UTC')::date
    and q.remaining > 0;
  return found;
end;
$$;

revoke all on function public.usa_legal_search_consume_quota(uuid) from public, anon, authenticated;
grant execute on function public.usa_legal_search_consume_quota(uuid) to authenticated;

commit;

-- Deployment gate: review role ownership, function owner BYPASSRLS semantics,
-- RLS SELECT across tenants, atomic concurrent quota test, denial for anon,
-- revoked/expired memberships, multi-clinic identity handling, and rollback.
-- Synthetic, isolated database verification required. NO production test here.
