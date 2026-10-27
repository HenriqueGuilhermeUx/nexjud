\set ON_ERROR_STOP on
-- Run AFTER shared-supabase-usa-contract-tests.sql in disposable PG17.
-- Existing synthetic user "cccc..." acts as a previously unrelated identity.
do $$
begin
 if pg_catalog.has_function_privilege('authenticated',
    'usa_legal_internal.provision_disabled_tenant(uuid,uuid,text)','EXECUTE')
    or pg_catalog.has_function_privilege('anon',
    'usa_legal_internal.provision_disabled_tenant(uuid,uuid,text)','EXECUTE')
    or pg_catalog.has_table_privilege('usa_legal_provisioner',
    'public.usa_legal_memberships','INSERT')
    or pg_catalog.has_table_privilege('usa_legal_provisioner',
    'public.usa_legal_search_quotas','UPDATE')
 then raise exception 'USA provisioning privilege leakage'; end if;
end
$$;

set role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub','cccccccc-cccc-4ccc-8ccc-ccccccccccc3',false);
do $$
declare denied boolean := false;
begin
  begin
    perform usa_legal_internal.provision_disabled_tenant(
      '33333333-3333-4333-8333-333333333333',
      'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', repeat('a',64));
  exception when insufficient_privilege then denied:=true;
  end;
  if not denied then raise exception 'Authenticated user provisioned tenant'; end if;
end
$$;
reset role;

set role usa_legal_provisioner;
do $$
declare
  denied boolean;
begin
  if not usa_legal_internal.provision_disabled_tenant(
      '33333333-3333-4333-8333-333333333333',
      'cccccccc-cccc-4ccc-8ccc-ccccccccccc3',
      repeat('a',64)) then
    raise exception 'Operator creation returned false';
  end if;

  denied:=false;
  begin
    perform usa_legal_internal.provision_disabled_tenant(
      '33333333-3333-4333-8333-333333333333',
      'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', repeat('a',64));
  exception when unique_violation then denied:=true;
  end;
  if not denied then raise exception 'Duplicate operator tenant created'; end if;

  denied:=false;
  begin
    perform usa_legal_internal.provision_disabled_tenant(
      '44444444-4444-4444-8444-444444444444',
      'cccccccc-cccc-4ccc-8ccc-ccccccccccc3', 'unreviewed');
  exception when others then
    if sqlerrm<>'usa_provisioning_invalid_request' then raise; end if;
    denied:=true;
  end;
  if not denied then raise exception 'Missing evidence hash accepted'; end if;

  denied:=false;
  begin
    perform usa_legal_internal.provision_disabled_tenant(
      '44444444-4444-4444-8444-444444444444',
      'dddddddd-dddd-4ddd-8ddd-ddddddddddd4', repeat('b',64));
  exception when others then
    if sqlerrm<>'usa_provisioning_user_not_found' then raise; end if;
    denied:=true;
  end;
  if not denied then raise exception 'Unknown auth user accepted'; end if;

  denied:=false;
  begin
    insert into public.usa_legal_tenants(id)
      values ('55555555-5555-4555-8555-555555555555');
  exception when insufficient_privilege then denied:=true;
  end;
  if not denied then raise exception 'Operator bypassed narrow onboarding API'; end if;
end
$$;
reset role;

do $$
begin
 if (select count(*) from public.usa_legal_tenants where id in (
    '33333333-3333-4333-8333-333333333333',
    '44444444-4444-4444-8444-444444444444'))<>1
 or (select status from public.usa_legal_tenants
     where id='33333333-3333-4333-8333-333333333333')<>'disabled'
 or (select role||':'||status from public.usa_legal_memberships
     where user_id='cccccccc-cccc-4ccc-8ccc-ccccccccccc3')<>'owner:pending'
 or (select enabled from public.usa_legal_research_entitlements
     where tenant_id='33333333-3333-4333-8333-333333333333')<>false
 or (select remaining from public.usa_legal_search_quotas
     where tenant_id='33333333-3333-4333-8333-333333333333')<>0
 then raise exception 'Onboarding did not fail closed or wrote partial rows'; end if;
end
$$;

-- Check user still cannot use US feature with pending and disabled state.
set role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub','cccccccc-cccc-4ccc-8ccc-ccccccccccc3',false);
do $$
begin
 if (select count(*) from public.usa_legal_memberships)<>0
    or (select count(*) from public.usa_legal_research_entitlements)<>0
    or public.usa_legal_search_consume_quota(
     '33333333-3333-4333-8333-333333333333')
 then raise exception 'Disabled USA onboarding granted live feature access'; end if;
end
$$;
reset role;
