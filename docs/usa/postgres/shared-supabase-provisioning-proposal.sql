-- DISPOSABLE POSTGRES ONLY: NexJud USA operator-only onboarding prototype.
-- Requires shared-supabase-fixture.sql and shared-supabase-usa-proposal.sql.
-- No production migrations, user data, permissions, deployments or API access.
-- Provisioning does NOT activate a tenant or certify human/legal identity.

create role usa_legal_provisioner nologin;
-- Intentionally no GRANTs on any Brazilian or US application tables.
grant usage on schema usa_legal_internal to usa_legal_provisioner;

-- Private evidence trail. A database administrator can still change the
-- database/trigger; independent external audit custody is NOT implemented.
create table usa_legal_internal.provisioning_events (
  tenant_id uuid primary key references public.usa_legal_tenants(id),
  owner_user_id uuid not null references auth.users(id),
  approval_evidence_sha256 text not null
    check (approval_evidence_sha256 ~ '^[0-9a-f]{64}$'),
  recorded_at timestamptz not null default transaction_timestamp()
);
revoke all on usa_legal_internal.provisioning_events
  from public, anon, authenticated, usa_legal_provisioner;
alter table usa_legal_internal.provisioning_events enable row level security;

create or replace function usa_legal_internal.reject_provisioning_event_change()
returns trigger language plpgsql set search_path = '' as $audit$
begin
  raise exception 'usa_provisioning_history_append_only';
end
$audit$;
revoke all on function usa_legal_internal.reject_provisioning_event_change()
  from public, anon, authenticated, usa_legal_provisioner;
create trigger usa_provisioning_history_guard
  before update or delete on usa_legal_internal.provisioning_events
  for each row execute function usa_legal_internal.reject_provisioning_event_change();

-- Only a separate operator role can invoke; clients cannot mint a US member.
-- Keep this private schema out of the Supabase exposed Data API schemas.
create or replace function usa_legal_internal.provision_disabled_tenant(
  p_tenant_id uuid, p_owner_id uuid, p_approval_sha256 text
) returns boolean
language plpgsql security definer set search_path = '' as $usa$
begin
  if p_tenant_id is null or p_owner_id is null or
     p_approval_sha256 is null or
     p_approval_sha256 !~ '^[0-9a-f]{64}$' or
     p_tenant_id = p_owner_id then
    raise exception 'usa_provisioning_invalid_request';
  end if;
  if not exists (select 1 from auth.users u where u.id = p_owner_id) then
    raise exception 'usa_provisioning_user_not_found';
  end if;

  -- One transaction: disabled US tenant, pending owner, no entitlement,
  -- zero search quota, and retained hash of external approval evidence.
  insert into public.usa_legal_tenants (id, status)
  values (p_tenant_id, 'disabled');
  insert into public.usa_legal_memberships (tenant_id, user_id, role, status)
  values (p_tenant_id, p_owner_id, 'owner', 'pending');
  insert into public.usa_legal_research_entitlements
    (tenant_id, enabled, valid_until)
  values (p_tenant_id, false, null);
  insert into public.usa_legal_search_quotas (tenant_id, remaining)
  values (p_tenant_id, 0);
  insert into usa_legal_internal.provisioning_events
    (tenant_id, owner_user_id, approval_evidence_sha256)
  values (p_tenant_id, p_owner_id, p_approval_sha256);
  return true;
end
$usa$;

revoke all on function
  usa_legal_internal.provision_disabled_tenant(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function
  usa_legal_internal.provision_disabled_tenant(uuid, uuid, text)
  to usa_legal_provisioner;

comment on function usa_legal_internal.provision_disabled_tenant(uuid,uuid,text)
is 'DISPOSABLE PROPOSAL ONLY: disabled US tenant, pending owner, disabled entitlement, zero quota and private evidence SHA-256; no identity or rights certification.';
