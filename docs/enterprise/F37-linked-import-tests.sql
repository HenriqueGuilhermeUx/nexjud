-- STAGING ONLY. Validate linked import, RLS and rollback with two tenants.
begin;
insert into auth.users(id) values
 ('a1111111-1111-4111-8111-111111111111'),
 ('b2222222-2222-4222-8222-222222222222'),
 ('c3333333-3333-4333-8333-333333333333'),
 ('e4444444-4444-4444-8444-444444444444');
insert into public.enterprise_organizations(id,name,created_by) values
 ('d1111111-1111-4111-8111-111111111111','Org One','a1111111-1111-4111-8111-111111111111'),
 ('d2222222-2222-4222-8222-222222222222','Org Two','b2222222-2222-4222-8222-222222222222');
insert into public.enterprise_memberships(organization_id,user_id,role) values
 ('d1111111-1111-4111-8111-111111111111','a1111111-1111-4111-8111-111111111111','admin'),
 ('d1111111-1111-4111-8111-111111111111','c3333333-3333-4333-8333-333333333333','reader'),
 ('d1111111-1111-4111-8111-111111111111','e4444444-4444-4444-8444-444444444444','legal'),
 ('d2222222-2222-4222-8222-222222222222','b2222222-2222-4222-8222-222222222222','owner');
set local role authenticated;
select set_config('request.jwt.claim.sub','a1111111-1111-4111-8111-111111111111',true);
do $verify$
declare
  v_response jsonb;
  v_again jsonb;
  v_duplicate_denied boolean := false;
  v_no_key boolean := false;
  v_no_source boolean := false;
  v_no_external boolean := false;
  v_items jsonb := '[{"externalId":"client-case-1","sourceSystem":"crm","cnjDigits":"00000000002026826000"}]';
begin
  v_response := public.enterprise_import_cases('d1111111-1111-4111-8111-111111111111','import-A',v_items);
  v_again := public.enterprise_import_cases('d1111111-1111-4111-8111-111111111111','import-A',v_items);
  if v_response->>'status' <> 'created'
     or v_again->>'status' <> 'already_processed'
     or v_again->'receipt' <> v_response->'receipt'
  then raise exception 'linked import/replay failed'; end if;
  begin
    perform public.enterprise_import_cases(
      'd1111111-1111-4111-8111-111111111111','new-key-same-external',v_items
    );
  exception when unique_violation then v_duplicate_denied := true;
  end;
  if not v_duplicate_denied then raise exception 'duplicate external id accepted'; end if;
  -- Audit identifiers may contain international letters but not invisible
  -- formatting controls or embedded newlines. Reject them inside the RPC too,
  -- even when the Edge Function is bypassed by an authenticated client.
  begin
      perform public.enterprise_import_cases(
        'd1111111-1111-4111-8111-111111111111','bad-' || pg_catalog.chr(8238),v_items);
    exception when invalid_parameter_value then v_no_key := true;
    end;
    begin
      perform public.enterprise_import_cases(
        'd1111111-1111-4111-8111-111111111111','invalid-source',
        pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
          'externalId','new', 'sourceSystem','crm' || pg_catalog.chr(8206),
          'cnjDigits','00000000002026826000')));
    exception when invalid_parameter_value then v_no_source := true;
    end;
    begin
      perform public.enterprise_import_cases(
        'd1111111-1111-4111-8111-111111111111','invalid-external',
        pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
          'externalId','new' || pg_catalog.chr(10), 'sourceSystem','crm',
          'cnjDigits','00000000002026826000')));
    exception when invalid_parameter_value then v_no_external := true;
    end;
    if not (v_no_key and v_no_source and v_no_external) then
      raise exception 'invisible audit control accepted by Enterprise RPC';
    end if;
end $verify$;
-- A second authorized professional in the SAME organization cannot
-- obtain the first importer's receipt by replaying an identical tenant/key.
select set_config('request.jwt.claim.sub','e4444444-4444-4444-8444-444444444444',true);
do $other_actor$
declare
  v_denied boolean := false;
  v_denied_changed boolean := false;
  v_items jsonb := '[{"externalId":"client-case-1","sourceSystem":"crm","cnjDigits":"00000000002026826000"}]';
begin
  begin
    perform public.enterprise_import_cases(
      'd1111111-1111-4111-8111-111111111111', 'import-A', v_items);
  exception when insufficient_privilege then v_denied := true;
  end;
  begin
    perform public.enterprise_import_cases(
      'd1111111-1111-4111-8111-111111111111','import-A',
      '[{"externalId":"different","sourceSystem":"crm","cnjDigits":"00000000002026826000"}]'::jsonb);
  exception when insufficient_privilege then v_denied_changed := true;
  end;
  if not v_denied or not v_denied_changed then
    raise exception 'second member can access the first importer receipt';
  end if;
end $other_actor$;
select set_config('request.jwt.claim.sub','a1111111-1111-4111-8111-111111111111',true);
-- Legacy view remains strictly personal despite tenant membership.
do $verify$
begin
  if (select count(*) from public.legal_cases
    where user_id='a1111111-1111-4111-8111-111111111111') <> 1
  then raise exception 'actor cannot read own imported case'; end if;
end $verify$;
select set_config('request.jwt.claim.sub','c3333333-3333-4333-8333-333333333333',true);
do $verify$
declare
  v_denied boolean := false;
begin
  if (select count(*) from public.legal_cases) <> 0
  then raise exception 'reader can read cases owned by another user'; end if;
  begin
    perform public.enterprise_import_cases(
      'd1111111-1111-4111-8111-111111111111','reader-not-allowed',
      '[{"externalId":"x","sourceSystem":"crm","cnjDigits":"00000000002026826000"}]'::jsonb
    );
  exception when insufficient_privilege then v_denied := true;
  end;
  if not v_denied then raise exception 'reader can import cases'; end if;
end $verify$;
select set_config('request.jwt.claim.sub','b2222222-2222-4222-8222-222222222222',true);
do $verify$
declare v_response jsonb;
begin
  v_response := public.enterprise_import_cases(
    'd2222222-2222-4222-8222-222222222222','import-B',
    '[{"externalId":"client-case-1","sourceSystem":"crm","cnjDigits":"00000000002026826000"}]'::jsonb
  );
  if v_response->>'status' <> 'created' then raise exception 'second tenant blocked'; end if;
  if (select count(*) from public.legal_cases) <> 1
  then raise exception 'second tenant can read another actor case'; end if;
end $verify$;
reset role;
do $verify$
begin
  if (select count(*) from public.legal_cases
      where process_number='00000000002026826000') <> 2
  then raise exception 'missing or duplicate legacy cases'; end if;
  if (select count(*) from public.enterprise_case_links) <> 2
  then raise exception 'links missing/duplicated'; end if;
  if (select count(*) from public.enterprise_import_batches
      where organization_id='d1111111-1111-4111-8111-111111111111') <> 1
  then raise exception 'conflicting import failed to roll back batch'; end if;
  if (select count(*) from public.enterprise_import_audit
      where organization_id in (
        'd1111111-1111-4111-8111-111111111111',
        'd2222222-2222-4222-8222-222222222222'
      )) <> 2
  then raise exception 'audit not atomic'; end if;
  if exists (
    select 1 from public.enterprise_case_links l
    join public.legal_cases c on c.id=l.case_id
    join public.enterprise_import_batches b on b.id=l.batch_id
    where l.organization_id <> b.organization_id
       or l.actor_id <> c.user_id
       or l.actor_id <> b.actor_id
  ) then raise exception 'cross-tenant link or owner mismatch'; end if;
end $verify$;
-- The user's existing legal_cases DELETE flow must remain functional.
-- Removing a case removes only its private link; immutable batch and audit
-- evidence stay stored for idempotency and compliance.
set local role authenticated;
select set_config('request.jwt.claim.sub','a1111111-1111-4111-8111-111111111111',true);
do $delete_check$
declare deleted_count integer;
begin
  delete from public.legal_cases
  where user_id='a1111111-1111-4111-8111-111111111111'
    and process_number='00000000002026826000';
  get diagnostics deleted_count = row_count;
  if deleted_count <> 1 then raise exception 'legacy case owner delete was blocked'; end if;
end $delete_check$;
reset role;
do $delete_check$
begin
  if (select count(*) from public.enterprise_case_links) <> 1
  then raise exception 'private case link was not safely removed'; end if;
  if (select count(*) from public.legal_cases
      where user_id='b2222222-2222-4222-8222-222222222222') <> 1
  then raise exception 'case deletion crossed tenant boundary'; end if;
  if (select count(*) from public.enterprise_import_batches
      where organization_id in (
        'd1111111-1111-4111-8111-111111111111',
        'd2222222-2222-4222-8222-222222222222'
      )) <> 2
  then raise exception 'case deletion removed import evidence'; end if;
  if (select count(*) from public.enterprise_import_audit
      where organization_id in (
        'd1111111-1111-4111-8111-111111111111',
        'd2222222-2222-4222-8222-222222222222'
      )) <> 2
  then raise exception 'case deletion removed audit evidence'; end if;
end $delete_check$;
rollback;
