-- Disposable PostgreSQL only. Run after F29.
begin;
insert into auth.users(id) values
 ('aaaaaaaa-8888-4888-8888-888888888888'),
 ('bbbbbbbb-8888-4888-8888-888888888888');
insert into public.enterprise_organizations(id,name,created_by) values
 ('cccccccc-8888-4888-8888-888888888888','RPC A','aaaaaaaa-8888-4888-8888-888888888888'),
 ('dddddddd-8888-4888-8888-888888888888','RPC B','bbbbbbbb-8888-4888-8888-888888888888');
insert into public.enterprise_memberships(organization_id,user_id,role) values
 ('cccccccc-8888-4888-8888-888888888888','aaaaaaaa-8888-4888-8888-888888888888','legal'),
 ('dddddddd-8888-4888-8888-888888888888','bbbbbbbb-8888-4888-8888-888888888888','reader');

do $$
begin
 if has_function_privilege('anon','enterprise_internal.commit_case_import(uuid,text,text,jsonb)','EXECUTE')
 then raise exception 'Anon can execute private import RPC'; end if;
 if not has_function_privilege('authenticated','enterprise_internal.commit_case_import(uuid,text,text,jsonb)','EXECUTE')
 then raise exception 'Authenticated lacks explicit RPC grant'; end if;
end $$;

set local role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-8888-4888-8888-888888888888',true);
do $$
declare
  first jsonb;
  replay jsonb;
  rejected boolean := false;
  items jsonb := '[{"externalId":"case-1","sourceSystem":"erp","cnjDigits":"00000000002026826000"}]';
begin
 first := enterprise_internal.commit_case_import(
 'cccccccc-8888-4888-8888-888888888888','rpc-key','sha256:'||repeat('a',64),items);
 if first->>'status' <> 'created' or (first->'receipt'->>'itemCount')::int <> 1
 then raise exception 'RPC create failed'; end if;
 replay := enterprise_internal.commit_case_import(
 'cccccccc-8888-4888-8888-888888888888','rpc-key','sha256:'||repeat('a',64),items);
 if replay->>'status' <> 'already_processed' or replay->'receipt' <> first->'receipt'
 then raise exception 'Replay changed receipt'; end if;
 begin
  perform enterprise_internal.commit_case_import(
  'cccccccc-8888-4888-8888-888888888888','rpc-key','sha256:'||repeat('b',64),items);
 exception when unique_violation then rejected := true;
 end;
 if not rejected then raise exception 'Fingerprint conflict accepted'; end if;
 rejected := false;
 begin
  perform enterprise_internal.commit_case_import(
  'cccccccc-8888-4888-8888-888888888888','bad-key','sha256:'||repeat('c',64),
  '[{"externalId":"bad","sourceSystem":"erp","cnjDigits":"wrong"}]'::jsonb);
 exception when invalid_parameter_value or check_violation then rejected := true;
 end;
 if not rejected then raise exception 'Invalid item accepted'; end if;
 -- Table-level checks are performed as postgres after RESET ROLE.
 -- Authenticated users must not receive direct SELECT on import tables.
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','bbbbbbbb-8888-4888-8888-888888888888',true);
do $$
declare rejected boolean := false;
begin
 begin
  perform enterprise_internal.commit_case_import(
  'dddddddd-8888-4888-8888-888888888888','reader-key','sha256:'||repeat('a',64),
  '[{"externalId":"x","sourceSystem":"erp","cnjDigits":"00000000002026826000"}]'::jsonb);
 exception when insufficient_privilege then rejected := true;
 end;
 if not rejected then raise exception 'Reader was allowed to import'; end if;
 rejected := false;
 begin
  perform enterprise_internal.commit_case_import(
  'cccccccc-8888-4888-8888-888888888888','cross-tenant','sha256:'||repeat('a',64),
  '[{"externalId":"x","sourceSystem":"erp","cnjDigits":"00000000002026826000"}]'::jsonb);
 exception when insufficient_privilege then rejected := true;
 end;
 if not rejected then raise exception 'Cross-tenant import accepted'; end if;
end $$;
reset role;
do $verify$
begin
 if (select count(*) from public.enterprise_import_batches
     where organization_id='cccccccc-8888-4888-8888-888888888888') <> 1
 then raise exception 'Invalid import left a batch'; end if;
 if (select count(*) from public.enterprise_import_items
     where organization_id='cccccccc-8888-4888-8888-888888888888') <> 1
 then raise exception 'Invalid import left an item'; end if;
 if (select count(*) from public.enterprise_import_audit
     where organization_id='cccccccc-8888-4888-8888-888888888888') <> 1
 then raise exception 'Replay/conflict/invalid import altered audit count'; end if;
end $verify$;
rollback;
