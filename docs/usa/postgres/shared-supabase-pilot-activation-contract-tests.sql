\set ON_ERROR_STOP on
-- Synthetic PostgreSQL-only dual-control gate; no users from NexJud Brasil.
-- Prior tests have created a DISABLED US tenant with pending owner "cccc...".
do $$
begin
 if pg_catalog.has_function_privilege('authenticated',
    'usa_legal_internal.activate_pilot_only(uuid)','EXECUTE') or
    pg_catalog.has_function_privilege('anon',
    'usa_legal_internal.activate_pilot_only(uuid)','EXECUTE') or
    pg_catalog.has_function_privilege('usa_legal_provisioner',
    'usa_legal_internal.activate_pilot_only(uuid)','EXECUTE') or
    pg_catalog.has_function_privilege('usa_legal_pilot_activator',
    'usa_legal_internal.record_security_pilot_review(uuid,text)','EXECUTE') or
    pg_catalog.has_function_privilege('usa_legal_security_reviewer',
    'usa_legal_internal.record_release_pilot_review(uuid,text)','EXECUTE') or
    pg_catalog.has_function_privilege('usa_legal_release_reviewer',
    'usa_legal_internal.record_security_pilot_review(uuid,text)','EXECUTE') or
    pg_catalog.has_table_privilege('usa_legal_pilot_activator',
    'public.usa_legal_memberships','UPDATE') or
    pg_catalog.has_table_privilege('usa_legal_security_reviewer',
    'public.usa_legal_tenants','UPDATE')
 then raise exception 'USA pilot gate elevated rights detected'; end if;
end
$$;

set role usa_legal_pilot_activator;
do $$
declare blocked boolean:=false;
begin
 begin
  perform usa_legal_internal.activate_pilot_only(
    '33333333-3333-4333-8333-333333333333');
 exception when others then
  if sqlerrm <> 'usa_pilot_missing_dual_review' then raise; end if;
  blocked:=true;
 end;
 if not blocked then raise exception 'Pilot activated with no reviews'; end if;
end
$$;
reset role;

set role usa_legal_release_reviewer;
do $$
declare blocked boolean:=false;
begin
 begin
  perform usa_legal_internal.record_release_pilot_review(
    '33333333-3333-4333-8333-333333333333',repeat('c',64));
 exception when others then
  if sqlerrm <> 'usa_pilot_missing_independent_security_review' then raise; end if;
  blocked:=true;
 end;
 if not blocked then raise exception 'Release review accepted without security'; end if;
end
$$;
reset role;

set role usa_legal_security_reviewer;
do $$
declare blocked boolean:=false;
begin
 begin
  perform usa_legal_internal.record_security_pilot_review(
    '33333333-3333-4333-8333-333333333333',repeat('a',64));
 exception when others then
  if sqlerrm <> 'usa_pilot_not_reviewable' then raise; end if;
  blocked:=true;
 end;
 if not blocked then raise exception 'Onboarding evidence reused for security'; end if;
 if not usa_legal_internal.record_security_pilot_review(
      '33333333-3333-4333-8333-333333333333',repeat('b',64)) then
  raise exception 'Security reviewer could not create review';
 end if;
 blocked:=false;
 begin
  perform usa_legal_internal.record_security_pilot_review(
    '33333333-3333-4333-8333-333333333333',repeat('d',64));
 exception when unique_violation then blocked:=true;
 end;
 if not blocked then raise exception 'Duplicate security review allowed'; end if;
end
$$;
reset role;

set role usa_legal_release_reviewer;
do $$
declare blocked boolean:=false;
begin
 begin
  perform usa_legal_internal.record_release_pilot_review(
    '33333333-3333-4333-8333-333333333333',repeat('b',64));
 exception when others then
  if sqlerrm <> 'usa_pilot_missing_independent_security_review' then raise; end if;
  blocked:=true;
 end;
 if not blocked then raise exception 'Same evidence reused across reviewers'; end if;
 if not usa_legal_internal.record_release_pilot_review(
      '33333333-3333-4333-8333-333333333333',repeat('c',64)) then
  raise exception 'Release reviewer could not create review';
 end if;
end
$$;
reset role;

set role usa_legal_pilot_activator;
do $$
declare blocked boolean:=false;
begin
 if not usa_legal_internal.activate_pilot_only(
     '33333333-3333-4333-8333-333333333333') then
   raise exception 'Reviewed pilot failed activation';
 end if;
 begin
  perform usa_legal_internal.activate_pilot_only(
    '33333333-3333-4333-8333-333333333333');
 exception when others then
  if sqlerrm <> 'usa_pilot_not_eligible' then raise; end if;
  blocked:=true;
 end;
 if not blocked then raise exception 'Replay activation accepted'; end if;

 blocked:=false;
 begin
  update public.usa_legal_tenants set status='disabled'
    where id='33333333-3333-4333-8333-333333333333';
 exception when insufficient_privilege then blocked:=true;
 end;
 if not blocked then raise exception 'Activator modified tenant directly'; end if;
end
$$;
reset role;

do $$
declare blocked boolean:=false;
begin
 if (select status from public.usa_legal_tenants
     where id='33333333-3333-4333-8333-333333333333') <> 'active' or
    (select status from public.usa_legal_memberships
     where user_id='cccccccc-cccc-4ccc-8ccc-ccccccccccc3') <> 'active' or
    (select enabled from public.usa_legal_research_entitlements
     where tenant_id='33333333-3333-4333-8333-333333333333') <> false or
    (select remaining from public.usa_legal_search_quotas
     where tenant_id='33333333-3333-4333-8333-333333333333') <> 0 or
    (select count(*) from usa_legal_internal.pilot_review_events) <> 2 or
    (select count(*) from usa_legal_internal.pilot_activation_events) <> 1
 then raise exception 'Pilot activation changed research gates or failed atomicity'; end if;
 begin
  update usa_legal_internal.pilot_review_events set evidence_sha256=repeat('f',64)
     where tenant_id='33333333-3333-4333-8333-333333333333';
 exception when others then
  if sqlerrm <> 'usa_provisioning_history_append_only' then raise; end if;
  blocked:=true;
 end;
 if not blocked then raise exception 'Pilot review event mutable'; end if;
 blocked:=false;
 begin
  delete from usa_legal_internal.pilot_activation_events
    where tenant_id='33333333-3333-4333-8333-333333333333';
 exception when others then
  if sqlerrm <> 'usa_provisioning_history_append_only' then raise; end if;
  blocked:=true;
 end;
 if not blocked then raise exception 'Pilot activation event mutable'; end if;
end
$$;

-- After approved activation, owner's pilot shell is ready, but no research.
set role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub','cccccccc-cccc-4ccc-8ccc-ccccccccccc3',false);
do $$
begin
 if not public.usa_legal_pilot_access_ready() then
  raise exception 'Approved US pilot user denied access';
 end if;
 if public.usa_legal_search_consume_quota(
    '33333333-3333-4333-8333-333333333333') then
  raise exception 'US pilot activation wrongly enabled legal research';
 end if;
 if (select count(*) from public.usa_legal_memberships) <> 1 then
  raise exception 'US pilot membership RLS isolation failed';
 end if;
end
$$;
reset role;

-- The same operator receipts cannot authorize different tenant identities.
set role usa_legal_security_reviewer;
do $$
declare blocked boolean:=false;
begin
 begin
  perform usa_legal_internal.record_security_pilot_review(
    '44444444-4444-4444-8444-444444444444',repeat('d',64));
 exception when others then
  if sqlerrm <> 'usa_pilot_not_reviewable' then raise; end if;
  blocked:=true;
 end;
 if not blocked then raise exception 'Unknown tenant received review'; end if;
end
$$;
reset role;

select 'PASS: separate-role US pilot shell activation, research still disabled' as result;
