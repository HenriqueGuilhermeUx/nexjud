-- Disposable PostgreSQL only, after F32.
begin;
insert into auth.users(id) values
 ('aaaaaaaa-9999-4999-8999-999999999999'),
 ('bbbbbbbb-9999-4999-8999-999999999999');
insert into public.enterprise_organizations(id,name,created_by) values
 ('cccccccc-9999-4999-8999-999999999999','Gateway A','aaaaaaaa-9999-4999-8999-999999999999');
insert into public.enterprise_memberships(organization_id,user_id,role) values
 ('cccccccc-9999-4999-8999-999999999999','aaaaaaaa-9999-4999-8999-999999999999','admin');
do $check$
begin
 if has_function_privilege('anon','public.enterprise_import_cases(uuid,text,jsonb)','execute')
 then raise exception 'anon can call gateway'; end if;
 if not has_function_privilege('authenticated','public.enterprise_import_cases(uuid,text,jsonb)','execute')
 then raise exception 'authenticated cannot call gateway'; end if;
end $check$;
set local role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-9999-4999-8999-999999999999',true);
do $test$
declare
 v_created jsonb;
 v_replay jsonb;
 v_conflict boolean := false;
 v_items jsonb := '[{"externalId":"one","sourceSystem":"crm","cnjDigits":"00000000002026826000"}]';
begin
 v_created := public.enterprise_import_cases('cccccccc-9999-4999-8999-999999999999','gateway-key',v_items);
 v_replay := public.enterprise_import_cases('cccccccc-9999-4999-8999-999999999999','gateway-key',v_items);
 if v_created->>'status' <> 'created' or v_replay->>'status' <> 'already_processed'
    or v_created->'receipt' <> v_replay->'receipt'
 then raise exception 'gateway create/replay failed'; end if;
 begin
  perform public.enterprise_import_cases('cccccccc-9999-4999-8999-999999999999','gateway-key',
  '[{"externalId":"two","sourceSystem":"crm","cnjDigits":"00000000002026826000"}]'::jsonb);
 exception when unique_violation then v_conflict := true;
 end;
 if not v_conflict then raise exception 'changed payload accepted under same key'; end if;
end $test$;
select set_config('request.jwt.claim.sub','bbbbbbbb-9999-4999-8999-999999999999',true);
do $test$
declare rejected boolean := false;
begin
 begin
 perform public.enterprise_import_cases('cccccccc-9999-4999-8999-999999999999','other-user',
 '[{"externalId":"x","sourceSystem":"crm","cnjDigits":"00000000002026826000"}]'::jsonb);
 exception when insufficient_privilege then rejected := true;
 end;
 if not rejected then raise exception 'cross-user call succeeded'; end if;
end $test$;
reset role;
do $check$
begin
 if (select count(*) from public.enterprise_import_batches
 where organization_id='cccccccc-9999-4999-8999-999999999999') <> 1
 then raise exception 'unexpected batches'; end if;
end $check$;
rollback;
