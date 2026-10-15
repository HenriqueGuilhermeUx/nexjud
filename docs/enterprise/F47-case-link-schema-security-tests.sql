-- F47: inspect F46 staging DDL after applying on disposable PostgreSQL.
-- READ ONLY assertions: no user records are created or mutated.
do $check$
declare
  v_rel oid := 'public.enterprise_case_links'::regclass;
begin
  if not exists (
    select 1 from pg_catalog.pg_class
    where oid=v_rel and relrowsecurity and not relforcerowsecurity
  ) then raise exception 'Case-link RLS not enabled as expected'; end if;

  if exists (
    select 1 from pg_catalog.pg_policy
    where polrelid=v_rel
  ) then raise exception 'Case links unexpectedly exposed by an RLS policy'; end if;

  if has_table_privilege('anon',v_rel,'SELECT')
    or has_table_privilege('anon',v_rel,'INSERT')
    or has_table_privilege('authenticated',v_rel,'SELECT')
    or has_table_privilege('authenticated',v_rel,'INSERT')
    or has_table_privilege('authenticated',v_rel,'UPDATE')
    or has_table_privilege('authenticated',v_rel,'DELETE')
  then raise exception 'Public/client grant leaked private case links'; end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint c
    where c.conrelid=v_rel and c.confrelid='public.legal_cases'::regclass
      and c.contype='f' and c.confdeltype='c'
  ) then raise exception 'Legacy case delete not cascaded to link'; end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint c
    where c.conrelid=v_rel
      and c.contype='f'
      and c.confrelid='public.enterprise_import_batches'::regclass
      and pg_catalog.pg_get_constraintdef(c.oid)
        like '%FOREIGN KEY (batch_id, organization_id)%'
  ) then raise exception 'Tenant-scoped batch FK missing'; end if;

  if (select count(*) from pg_catalog.pg_constraint
      where conrelid=v_rel and contype='u') <> 2
  then raise exception 'Required source-key and case-link uniqueness missing'; end if;

  if not exists (select 1 from pg_catalog.pg_policy
    where polrelid='public.legal_cases'::regclass
      and polname='enterprise_fixture_owner_read')
  then raise exception 'Legacy case read policy was unexpectedly altered'; end if;
end $check$;
