-- STAGING-ONLY REPLACEMENT OF F29: links import items to existing legacy case model.
-- Run after F34 on disposable PostgreSQL. No production migration or deploy.
-- Requires F7 and F15 fixtures. Private, non-Data-API schema.
begin;
create schema if not exists enterprise_internal;
revoke all on schema enterprise_internal from public, anon, authenticated;
grant usage on schema enterprise_internal to authenticated;

create or replace function enterprise_internal.commit_case_import(
  p_organization uuid,
  p_key text,
  p_fingerprint text,
  p_items jsonb
) returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_role text;
  v_batch uuid;
  v_existing_fingerprint text;
  v_receipt jsonb;
  v_count integer;
  v_item record;
  v_case_id uuid;
begin
  if v_actor is null then raise exception 'unauthenticated' using errcode='28000'; end if;
  select role into v_role from public.enterprise_memberships
    where organization_id=p_organization and user_id=v_actor;
  if v_role is null or v_role not in ('owner','admin','legal') then
    raise exception 'forbidden' using errcode='42501';
  end if;
  if p_key is null or length(btrim(p_key)) not between 1 and 128
    or p_fingerprint is null or p_fingerprint !~ '^sha256:[a-f0-9]{64}$'
    or jsonb_typeof(p_items) is distinct from 'array'
    or jsonb_array_length(p_items) not between 1 and 500 then
    raise exception 'invalid import' using errcode='22023';
  end if;
  -- The unique index serializes simultaneous inserts of the same tenant/key.
  insert into public.enterprise_import_batches(organization_id,idempotency_key,fingerprint,actor_id,receipt)
  values (p_organization,btrim(p_key),p_fingerprint,v_actor,'{}'::jsonb)
  on conflict (organization_id,idempotency_key) do nothing
  returning id into v_batch;
  if v_batch is null then
    select fingerprint,receipt into v_existing_fingerprint,v_receipt
      from public.enterprise_import_batches
      where organization_id=p_organization and idempotency_key=btrim(p_key);
    if v_existing_fingerprint is null then
      raise exception 'concurrent import retry required' using errcode='40001';
    end if;
    if v_existing_fingerprint <> p_fingerprint then
      raise exception 'idempotency conflict' using errcode='23505';
    end if;
    return jsonb_build_object('status','already_processed','receipt',v_receipt);
  end if;
  -- Validate and write items within the same database transaction.
  if exists (
    select 1 from jsonb_array_elements(p_items) item
    where jsonb_typeof(item) <> 'object'
      or jsonb_typeof(item->'externalId') <> 'string'
      or jsonb_typeof(item->'sourceSystem') <> 'string'
      or jsonb_typeof(item->'cnjDigits') <> 'string'
      or length(btrim(item->>'externalId')) not between 1 and 160
      or length(btrim(item->>'sourceSystem')) not between 1 and 160
      or (item->>'cnjDigits') !~ '^[0-9]{20}$'
      or (select count(*) from jsonb_object_keys(item)) <> 3
  ) then raise exception 'invalid items' using errcode='22023'; end if;
  insert into public.enterprise_import_items(batch_id,organization_id,external_id,source_system,cnj_digits)
  select v_batch,p_organization,btrim(item->>'externalId'),btrim(item->>'sourceSystem'),item->>'cnjDigits'
  from jsonb_array_elements(p_items) item;
  get diagnostics v_count = row_count;
  -- Only the authenticated initiating actor owns these legacy cases.
  -- Existing legacy RLS is unchanged; team-wide sharing needs a separately
  -- reviewed case authorization model.
  for v_item in
    select id,external_id,source_system,cnj_digits
    from public.enterprise_import_items where batch_id=v_batch
  loop
    insert into public.legal_cases(user_id,title,process_number,metadata)
    values (
      v_actor,
      'Processo ' || v_item.cnj_digits,
      v_item.cnj_digits,
      pg_catalog.jsonb_build_object(
        'enterpriseImport',pg_catalog.jsonb_build_object(
          'organizationId',p_organization,
          'batchId',v_batch,
          'sourceSystem',v_item.source_system,
          'externalId',v_item.external_id
        )
      )
    ) returning id into v_case_id;
    insert into public.enterprise_case_links(
      organization_id,case_id,batch_id,actor_id,source_system,external_id
    ) values (
      p_organization,v_case_id,v_batch,v_actor,v_item.source_system,v_item.external_id
    );
  end loop;
  v_receipt := jsonb_build_object(
    'organizationId',p_organization,'idempotencyKey',btrim(p_key),
    'itemCount',v_count,'actorId',v_actor,'plannedAt',clock_timestamp()
  );
  update public.enterprise_import_batches set receipt=v_receipt where id=v_batch;
  insert into public.enterprise_import_audit(batch_id,organization_id,actor_id,action)
  values (v_batch,p_organization,v_actor,'import_created');
  return jsonb_build_object('status','created','receipt',v_receipt);
end $$;
revoke all on function enterprise_internal.commit_case_import(uuid,text,text,jsonb) from public, anon;
grant execute on function enterprise_internal.commit_case_import(uuid,text,text,jsonb) to authenticated;
commit;
