\set ON_ERROR_STOP on
-- Runs only in synthetic PG17 after the dual-approval + concurrency tests.
-- Active reviewed pilot 3333 (owner cccc) is targeted for suspension.
-- Approved pilot 4444 and legacy synthetic tenant 1111 remain untouched.
do $$
begin
 if pg_catalog.has_function_privilege('anon',
    'usa_legal_internal.suspend_pilot_only(uuid,text)','EXECUTE')
    or pg_catalog.has_function_privilege('authenticated',
    'usa_legal_internal.suspend_pilot_only(uuid,text)','EXECUTE')
    or pg_catalog.has_function_privilege('usa_legal_pilot_activator',
    'usa_legal_internal.suspend_pilot_only(uuid,text)','EXECUTE')
    or pg_catalog.has_function_privilege('usa_legal_provisioner',
    'usa_legal_internal.suspend_pilot_only(uuid,text)','EXECUTE')
    or pg_catalog.has_table_privilege('usa_legal_pilot_suspender',
    'public.usa_legal_tenants','UPDATE')
    or pg_catalog.has_table_privilege('usa_legal_pilot_suspender',
    'public.usa_legal_search_quotas','UPDATE')
 then raise exception 'Emergency suspension rights exposed'; end if;
end
$$;

set role authenticated;
select pg_catalog.set_config(
 'request.jwt.claim.sub','cccccccc-cccc-4ccc-8ccc-ccccccccccc3',false);
do $$
declare denied boolean:=false;
begin
 if not public.usa_legal_pilot_access_ready() then
  raise exception 'Test fixture pilot unexpectedly inaccessible'; end if;
 begin
  perform usa_legal_internal.suspend_pilot_only(
   '33333333-3333-4333-8333-333333333333',repeat('f',64));
 exception when insufficient_privilege then denied:=true;
 end;
 if not denied then raise exception 'End user was allowed to suspend'; end if;
end
$$;
reset role;

set role usa_legal_pilot_activator;
do $$
declare denied boolean:=false;
begin
 begin
  perform usa_legal_internal.suspend_pilot_only(
   '33333333-3333-4333-8333-333333333333',repeat('f',64));
 exception when insufficient_privilege then denied:=true;
 end;
 if not denied then raise exception 'Activator could also suspend'; end if;
end
$$;
reset role;

set role usa_legal_pilot_suspender;
do $$
declare denied boolean:=false;
begin
 begin
  perform usa_legal_internal.suspend_pilot_only(
   '33333333-3333-4333-8333-333333333333','invalid');
 exception when others then
  if sqlerrm<>'usa_pilot_invalid_suspension' then raise; end if;
  denied:=true;
 end;
 if not denied then raise exception 'Invalid evidence hash accepted'; end if;

 denied:=false;
 begin
  perform usa_legal_internal.suspend_pilot_only(
   '33333333-3333-4333-8333-333333333333',repeat('b',64));
 exception when others then
  if sqlerrm<>'usa_pilot_invalid_suspension' then raise; end if;
  denied:=true;
 end;
 if not denied then raise exception 'Security review evidence reused'; end if;

 denied:=false;
 begin
  perform usa_legal_internal.suspend_pilot_only(
   '11111111-1111-4111-8111-111111111111',repeat('f',64));
 exception when others then
  if sqlerrm<>'usa_pilot_not_suspensible' then raise; end if;
  denied:=true;
 end;
 if not denied then raise exception 'Non-pilot organization suspended'; end if;

 if not usa_legal_internal.suspend_pilot_only(
   '33333333-3333-4333-8333-333333333333',repeat('f',64)) then
  raise exception 'Authorized suspension failed'; end if;

 denied:=false;
 begin
  perform usa_legal_internal.suspend_pilot_only(
   '33333333-3333-4333-8333-333333333333',repeat('e',64));
 exception when others then
  if sqlerrm<>'usa_pilot_not_suspensible' then raise; end if;
  denied:=true;
 end;
 if not denied then raise exception 'Duplicate suspension succeeded'; end if;

 denied:=false;
 begin
  update public.usa_legal_tenants set status='active'
    where id='33333333-3333-4333-8333-333333333333';
 exception when insufficient_privilege then denied:=true;
 end;
 if not denied then raise exception 'Suspension operator bypassed write gate'; end if;
end
$$;
reset role;

do $$
declare denied boolean:=false;
begin
 if (select status from public.usa_legal_tenants
   where id='33333333-3333-4333-8333-333333333333')<>'disabled'
 or (select status from public.usa_legal_memberships
   where user_id='cccccccc-cccc-4ccc-8ccc-ccccccccccc3')<>'revoked'
 or (select enabled from public.usa_legal_research_entitlements
   where tenant_id='33333333-3333-4333-8333-333333333333')<>false
 or (select remaining from public.usa_legal_search_quotas
   where tenant_id='33333333-3333-4333-8333-333333333333')<>0
 or (select reason_evidence_sha256 from usa_legal_internal.pilot_suspension_events
   where tenant_id='33333333-3333-4333-8333-333333333333')<>repeat('f',64)
 or (select count(*) from usa_legal_internal.pilot_suspension_events)<>1
 then raise exception 'Suspension failed atomic state/audit checks'; end if;

 if (select status from public.usa_legal_tenants
   where id='44444444-4444-4444-8444-444444444444')<>'active'
 or (select status from public.usa_legal_memberships
   where user_id='dddddddd-dddd-4ddd-8ddd-ddddddddddd4')<>'active'
 or (select status from public.usa_legal_tenants
   where id='11111111-1111-4111-8111-111111111111')<>'active'
 then raise exception 'Emergency stop affected unrelated US tenants'; end if;

 begin
  delete from usa_legal_internal.pilot_suspension_events
   where tenant_id='33333333-3333-4333-8333-333333333333';
 exception when others then
  if sqlerrm<>'usa_provisioning_history_append_only' then raise; end if;
  denied:=true;
 end;
 if not denied then raise exception 'Audit event deletion permitted'; end if;
end
$$;

set role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub',
  'cccccccc-cccc-4ccc-8ccc-ccccccccccc3',false);
do $$
begin
 if public.usa_legal_pilot_access_ready() then
  raise exception 'Suspended owner still has pilot access'; end if;
 if (select count(*) from public.usa_legal_memberships)<>0 then
  raise exception 'Revoked membership still visible under RLS'; end if;
 if (select count(*) from public.usa_legal_research_entitlements)<>0 then
  raise exception 'Suspended US entitlements visible under RLS'; end if;
 if public.usa_legal_search_consume_quota(
    '33333333-3333-4333-8333-333333333333') then
  raise exception 'Suspended US tenant consumed legal quota'; end if;
end
$$;
reset role;
select 'PASS: only approved US pilot was disabled, auditable, and denied' as result;
