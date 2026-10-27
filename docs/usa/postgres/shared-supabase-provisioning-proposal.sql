-- NexJud USA — operator-only provisioning prototype for SHARED Supabase.
-- DISPOSABLE PostgreSQL ONLY. NO PRODUCTION MIGRATION.
-- Execute after shared-supabase-usa-proposal.sql. No grants to anon,
-- authenticated, service_role, or browser clients. This operator role must
-- be independently administered, credentialed and audited before deployment.

create role usa_legal_provisioner nologin;
revoke all on role usa_legal_provisioner from public;

-- The role has NO US-table rights and NO Brazilian table grants. It can
-- invoke only an explicit SECURITY DEFINER onboarding function.
grant usage on schema usa_legal_internal to usa_legal_provisioner;

create or replace function usa_legal_internal.provision_disabled_tenant(
  p_tenant_id uuid, p_owner_id uuid, p_approval_sha256 text
) returns boolean
language plpgsql security definer set search_path = '' as $usa$
begin
  -- Require externally reviewed consent/onboarding evidence digest.
  -- This digest alone does not certify identity, legal agreement or rights.
  if p_tenant_id is null or p_owner_id is null or
     p_approval_sha256 is null or
     p_approval_sha256 !~ '^[0-9a-f]{64}$' or
     p_tenant_id=p_owner_id then
    raise exception 'usa_provisioning_invalid_request';
  end if;
  if not exists (select 1 from auth.users u where u.id=p_owner_id) then
    raise exception 'usa_provisioning_user_not_found';
  end if;

  -- All 4 inserts succeed or fail together. No customer authorization or
  -- searchable CourtListener access is issued in this onboarding step.
  insert into public.usa_legal_tenants (id,status)
  values (p_tenant_id,'disabled');
  insert into public.usa_legal_memberships (tenant_id,user_id,role,status)
  values (p_tenant_id,p_owner_id,'owner','pending');
  insert into public.usa_legal_research_entitlements
    (tenant_id,enabled,valid_until)
  values (p_tenant_id,false,null);
  insert into public.usa_legal_search_quotas (tenant_id,remaining)
  values (p_tenant_id,0);
  return true;
end
$usa$;

revoke all on function
  usa_legal_internal.provision_disabled_tenant(uuid,uuid,text)
  from public, anon, authenticated;
grant execute on function
  usa_legal_internal.provision_disabled_tenant(uuid,uuid,text)
  to usa_legal_provisioner;

comment on function usa_legal_internal.provision_disabled_tenant(uuid,uuid,text)
is 'ONLY synthetic/operator onboarding: creates a disabled US tenant, pending owner, disabled entitlement, zero quota. No real production activation or human identity attestation.';
