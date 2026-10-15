-- F49 — NexJud Enterprise staging ONLY; not a production migration.
-- Read-only gateway returns only the currently-authorized actor's batches.
-- Never grant direct SELECT on audit, import batches or private case links.
begin;

create or replace function enterprise_internal.actor_import_history(
  p_organization uuid,
  p_limit integer
) returns jsonb
language plpgsql stable security definer
set search_path = ''
as $history$
declare
  v_actor uuid := auth.uid();
  v_role text;
  v_data jsonb;
begin
  if v_actor is null then
    raise exception 'unauthenticated' using errcode='28000';
  end if;
  if p_organization is null or p_limit is null or p_limit not between 1 and 50 then
    raise exception 'invalid history request' using errcode='22023';
  end if;
  select role into v_role from public.enterprise_memberships
  where organization_id=p_organization and user_id=v_actor;

  -- Membership is checked against the table on EVERY call. No stale JWT roles.
  if v_role is null or v_role not in ('owner','admin','legal') then
    raise exception 'forbidden' using errcode='42501';
  end if;

  select coalesce(pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object(
      'batchId', b.id,
      'idempotencyKey', b.idempotency_key,
      'itemCount', (select count(*) from public.enterprise_import_items i
        where i.organization_id=p_organization and i.batch_id=b.id),
      'linkedCaseCount', (select count(*) from public.enterprise_case_links l
        where l.organization_id=p_organization and l.batch_id=b.id),
      'createdAt', b.created_at
    ) order by b.created_at desc, b.id desc
  ), '[]'::jsonb) into v_data
  from (
    select id, idempotency_key, created_at
    from public.enterprise_import_batches
    where organization_id=p_organization and actor_id=v_actor
    order by created_at desc,id desc
    limit p_limit
  ) b;
  return v_data;
end $history$;

revoke all on function enterprise_internal.actor_import_history(uuid,integer)
  from public, anon, authenticated;
grant execute on function enterprise_internal.actor_import_history(uuid,integer)
  to authenticated;

create or replace function public.enterprise_import_history(
  p_organization uuid,
  p_limit integer default 20
) returns jsonb
language sql stable security invoker
set search_path = ''
as $gateway$
  select enterprise_internal.actor_import_history(p_organization,p_limit);
$gateway$;
revoke all on function public.enterprise_import_history(uuid,integer)
  from public,anon;
grant execute on function public.enterprise_import_history(uuid,integer)
  to authenticated;
commit;
