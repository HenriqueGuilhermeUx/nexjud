-- F50 — disposable database only, after F49.
-- A complete history is private per actor, tenant and live membership.
begin;
insert into auth.users(id) values
 ('f1000000-0000-4000-8000-000000000001'),
 ('f1000000-0000-4000-8000-000000000002'),
 ('f1000000-0000-4000-8000-000000000003');
insert into public.enterprise_organizations(id,name,created_by) values
 ('f2000000-0000-4000-8000-000000000001','History Org',
  'f1000000-0000-4000-8000-000000000001');
insert into public.enterprise_memberships(organization_id,user_id,role) values
 ('f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000001','owner'),
 ('f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000002','admin'),
 ('f2000000-0000-4000-8000-000000000001','f1000000-0000-4000-8000-000000000003','reader');
do $privileges$
begin
  if has_function_privilege('anon','public.enterprise_import_history(uuid,integer)','execute')
    or has_function_privilege('anon','enterprise_internal.actor_import_history(uuid,integer)','execute')
  then raise exception 'anonymous history execution permitted'; end if;
  if has_table_privilege('authenticated','public.enterprise_import_batches','SELECT')
    or has_table_privilege('authenticated','public.enterprise_import_items','SELECT')
    or has_table_privilege('authenticated','public.enterprise_case_links','SELECT')
  then raise exception 'private tables exposed directly to authenticated'; end if;
end $privileges$;

set local role authenticated;
select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000001',true);
do $owner$
declare
  r jsonb;
begin
  if pg_catalog.jsonb_array_length(public.enterprise_import_history(
     'f2000000-0000-4000-8000-000000000001',20)) <> 0
  then raise exception 'fresh org unexpectedly has history'; end if;

  perform public.enterprise_import_cases(
   'f2000000-0000-4000-8000-000000000001','owner-history-1',
   '[{"externalId":"history-owner-one","sourceSystem":"crm","cnjDigits":"00000000002026826000"}]'::jsonb
  );
  r := public.enterprise_import_history('f2000000-0000-4000-8000-000000000001',20);
  if pg_catalog.jsonb_array_length(r) <> 1
     or r->0->>'idempotencyKey' <> 'owner-history-1'
     or (r->0->>'itemCount')::integer <> 1
     or (r->0->>'linkedCaseCount')::integer <> 1
     or r->0 ? 'actorId'
     or r->0 ? 'fingerprint'
     or r->0 ? 'receipt'
  then raise exception 'owner private history contract failed'; end if;

  begin
    perform public.enterprise_import_history(
      'f2000000-0000-4000-8000-000000000001',51);
    raise exception 'history unbounded limit accepted';
  exception when invalid_parameter_value then null;
  end;
end $owner$;

select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000002',true);
do $admin$
declare r jsonb;
begin
  r := public.enterprise_import_history('f2000000-0000-4000-8000-000000000001',20);
  if pg_catalog.jsonb_array_length(r) <> 0
  then raise exception 'admin read different actors history'; end if;
  perform public.enterprise_import_cases(
   'f2000000-0000-4000-8000-000000000001','admin-history-1',
   '[{"externalId":"history-admin-one","sourceSystem":"crm","cnjDigits":"00000000002026826000"}]'::jsonb);
  r := public.enterprise_import_history('f2000000-0000-4000-8000-000000000001',20);
  if pg_catalog.jsonb_array_length(r) <> 1
     or r->0->>'idempotencyKey' <> 'admin-history-1'
  then raise exception 'admin own history filtered incorrectly'; end if;
end $admin$;

select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000003',true);
do $reader$
declare denied boolean := false;
begin
  begin
    perform public.enterprise_import_history('f2000000-0000-4000-8000-000000000001',20);
  exception when insufficient_privilege then denied:=true;
  end;
  if not denied then raise exception 'reader viewed history'; end if;
end $reader$;

select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000001',true);
-- Deleting a case must not erase historical batch evidence.
delete from public.legal_cases
where user_id='f1000000-0000-4000-8000-000000000001'
  and process_number='00000000002026826000';
do $deleted$
declare r jsonb;
begin
  r := public.enterprise_import_history('f2000000-0000-4000-8000-000000000001',20);
  if pg_catalog.jsonb_array_length(r) <> 1
    or (r->0->>'linkedCaseCount')::integer <> 0
    or (r->0->>'itemCount')::integer <> 1
  then raise exception 'case deletion improperly erased batch evidence'; end if;
end $deleted$;

reset role;
delete from public.enterprise_memberships
  where organization_id='f2000000-0000-4000-8000-000000000001'
  and user_id='f1000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000001',true);
do $revoked$
declare denied boolean := false;
begin
  begin
    perform public.enterprise_import_history('f2000000-0000-4000-8000-000000000001',20);
  exception when insufficient_privilege then denied:=true;
  end;
  if not denied then raise exception 'revoked actor viewed old history'; end if;
end $revoked$;
reset role;
rollback;
