-- STAGING ONLY. Install after F29. Not a production migration.
-- Uses pgcrypto digest of normalized jsonb text; canonicalization is PostgreSQL-specific.
begin;
create extension if not exists pgcrypto;
create or replace function public.enterprise_import_cases(
  p_organization uuid,
  p_key text,
  p_items jsonb
) returns jsonb
language plpgsql security invoker
set search_path = ''
as $gateway$
declare
  v_fingerprint text;
begin
  if auth.uid() is null then
    raise exception 'unauthenticated' using errcode='28000';
  end if;
  if p_items is null or pg_catalog.jsonb_typeof(p_items) <> 'array'
    or pg_catalog.jsonb_array_length(p_items) not between 1 and 500 then
    raise exception 'invalid import' using errcode='22023';
  end if;
  -- Never accept fingerprint or actor identity from the caller.
  v_fingerprint := 'sha256:' || pg_catalog.encode(
    public.digest(pg_catalog.convert_to(p_items::text, 'UTF8'), 'sha256'), 'hex'
  );
  return enterprise_internal.commit_case_import(
    p_organization, p_key, v_fingerprint, p_items
  );
end $gateway$;
revoke all on function public.enterprise_import_cases(uuid,text,jsonb) from public, anon;
grant execute on function public.enterprise_import_cases(uuid,text,jsonb) to authenticated;
commit;
