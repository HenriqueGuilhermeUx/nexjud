-- NexJud USA shared Supabase project PROPOSAL — disposable PostgreSQL CI ONLY.
-- No changes to NexJud Brazil tables, functions, billing, users, or migrations.
-- Do NOT run this file against the existing production Supabase without
-- independent security, privacy, entitlement, backup and rollback approval.
-- "public" names are USA-prefixed because PostgREST's existing API exposes public.
-- The private schema is NOT an exposed Data API schema.

create schema if not exists usa_legal_internal;
revoke all on schema usa_legal_internal from public, anon, authenticated;
grant usage on schema usa_legal_internal to authenticated;

create table public.usa_legal_tenants (
  id uuid primary key,
  status text not null default 'disabled' check (status in ('active','disabled')),
  created_at timestamptz not null default now()
);
create table public.usa_legal_memberships (
  tenant_id uuid not null references public.usa_legal_tenants(id),
  user_id uuid not null references auth.users(id),
  role text not null check (role in ('owner','attorney','researcher','viewer')),
  status text not null default 'pending' check (status in ('pending','active','revoked')),
  primary key (tenant_id,user_id),
  -- V1 backend requires a single membership per user, never select first.
  unique (user_id)
);
create table public.usa_legal_research_entitlements (
  tenant_id uuid primary key references public.usa_legal_tenants(id),
  enabled boolean not null default false,
  valid_until timestamptz
);
create table public.usa_legal_search_quotas (
  tenant_id uuid primary key references public.usa_legal_tenants(id),
  remaining integer not null default 0 check (remaining >= 0),
  updated_at timestamptz not null default now()
);

revoke all on public.usa_legal_tenants from public, anon, authenticated;
revoke all on public.usa_legal_memberships from public, anon, authenticated;
revoke all on public.usa_legal_research_entitlements from public, anon, authenticated;
revoke all on public.usa_legal_search_quotas from public, anon, authenticated;

alter table public.usa_legal_tenants enable row level security;
alter table public.usa_legal_memberships enable row level security;
alter table public.usa_legal_research_entitlements enable row level security;
alter table public.usa_legal_search_quotas enable row level security;

-- Authenticated users may see ONLY their own active USA membership.
grant select on public.usa_legal_memberships to authenticated;
create policy usa_membership_self_only on public.usa_legal_memberships
  for select to authenticated
  using (user_id = (select auth.uid()) and status='active');

-- Entitlements are readable only to members with a current US role.
-- Does not grant ANY rights over Brazilian subscriptions or payments.
grant select on public.usa_legal_research_entitlements to authenticated;
create policy usa_entitlement_member_only on public.usa_legal_research_entitlements
  for select to authenticated
  using (exists (
    select 1 from public.usa_legal_memberships m
    where m.tenant_id = usa_legal_research_entitlements.tenant_id
      and m.user_id = (select auth.uid()) and m.status='active'
  ));

-- The exposed wrapper runs with the user's database role; it has no direct
-- table privilege. The private function validates auth.uid() from Supabase
-- Auth (not user_metadata), membership, tenant, entitlement and quota atomically.
create or replace function usa_legal_internal.consume_quota(
  p_tenant_id uuid
) returns boolean language plpgsql
security definer set search_path = '' as $$
declare
  v_user_id uuid := auth.uid();
  v_consumed uuid;
begin
  if v_user_id is null or p_tenant_id is null then return false; end if;

  update public.usa_legal_search_quotas q
     set remaining=q.remaining-1,updated_at=transaction_timestamp()
  where q.tenant_id=p_tenant_id and q.remaining>0
    and exists (select 1 from public.usa_legal_tenants t
      where t.id=q.tenant_id and t.status='active')
    and exists (select 1 from public.usa_legal_memberships m
      where m.tenant_id=q.tenant_id and m.user_id=v_user_id
        and m.status='active' and m.role in ('owner','attorney','researcher'))
    and exists (select 1 from public.usa_legal_research_entitlements e
      where e.tenant_id=q.tenant_id and e.enabled is true
        and (e.valid_until is null or e.valid_until>transaction_timestamp()))
  returning q.tenant_id into v_consumed;
  return v_consumed is not null;
end
$$;
revoke all on function usa_legal_internal.consume_quota(uuid) from public, anon;
grant execute on function usa_legal_internal.consume_quota(uuid) to authenticated;

create or replace function public.usa_legal_search_consume_quota(
  p_tenant_id uuid
) returns boolean language sql security invoker set search_path = '' as $$
  select usa_legal_internal.consume_quota(p_tenant_id)
$$;
revoke all on function public.usa_legal_search_consume_quota(uuid) from public, anon;
grant execute on function public.usa_legal_search_consume_quota(uuid) to authenticated;

-- Read-only pilot access check for an authenticated US member of an ACTIVE
-- tenant. A research entitlement and remaining quota are NOT implied. The
-- database checks auth.uid(), not a user_id supplied by the caller.
create or replace function usa_legal_internal.pilot_membership_active()
returns boolean language sql stable security definer set search_path = '' as $
  select (select auth.uid()) is not null and exists(
    select 1 from public.usa_legal_memberships m
    join public.usa_legal_tenants t on t.id = m.tenant_id
    where m.user_id = (select auth.uid())
      and m.status = 'active' and t.status = 'active'
  )
$;
revoke all on function usa_legal_internal.pilot_membership_active()
  from public, anon;
grant execute on function usa_legal_internal.pilot_membership_active()
  to authenticated;

-- Exposed invoker wrapper: no arguments, no arbitrarily chosen tenant ID.
create or replace function public.usa_legal_pilot_access_ready()
returns boolean language sql security invoker set search_path = '' as $
  select usa_legal_internal.pilot_membership_active()
$;
revoke all on function public.usa_legal_pilot_access_ready()
  from public, anon;
grant execute on function public.usa_legal_pilot_access_ready()
  to authenticated;

-- No public INSERT/UPDATE/DELETE privileges or permissive write policies
-- for any USA tenant, membership, entitlement or quota table.
-- Only a separately reviewed, backend-admin provisioning path may seed these.
comment on schema usa_legal_internal is
  'NexJud USA shared-infrastructure proposal; private quota rules; NOT APPLIED to production';
