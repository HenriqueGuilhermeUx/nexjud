-- NexJud Enterprise F46 — staging candidate ONLY. NOT APPLIED TO PRODUCTION.
-- This replaces the link-table portion of F34's disposable fixture.
-- It reuses an EXISTING legal_cases table and never modifies its rows, RLS,
-- grants, ownership policies or column definitions.
begin;

do $preflight$
begin
  if to_regclass('public.legal_cases') is null
     or to_regclass('public.enterprise_organizations') is null
     or to_regclass('public.enterprise_import_batches') is null then
    raise exception 'Missing Enterprise or legal_cases prerequisite tables';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='legal_cases'
      and c.relrowsecurity
  ) then
    raise exception 'legal_cases owner RLS must remain enabled';
  end if;
  if not exists (
    select 1 from pg_catalog.pg_constraint c
    where c.conrelid='public.legal_cases'::regclass
      and c.contype='p' and
      pg_catalog.pg_get_constraintdef(c.oid)='PRIMARY KEY (id)'
  ) then
    raise exception 'Unexpected legal_cases primary key';
  end if;
  if exists (
    select 1 from (values
      ('id','uuid'),
      ('user_id','uuid'),
      ('title','text'),
      ('process_number','text'),
      ('metadata','jsonb')
    ) as expected(col,typ)
    where not exists (
      select 1 from information_schema.columns actual
      where actual.table_schema='public' and actual.table_name='legal_cases'
        and actual.column_name=expected.col
        and actual.udt_name=expected.typ
    )
  ) then
    raise exception 'Unexpected legacy legal_cases column schema';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='legal_cases'
      and column_name='user_id' and is_nullable='NO'
  ) then
    raise exception 'Legacy case user_id must not be nullable';
  end if;
  if to_regclass('public.enterprise_case_links') is not null then
    raise exception 'Existing enterprise_case_links must be reviewed before installation';
  end if;
end $preflight$;

create table public.enterprise_case_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null
    references public.enterprise_organizations(id),
  case_id uuid not null
    references public.legal_cases(id) on delete cascade,
  batch_id uuid not null,
  actor_id uuid not null references auth.users(id),
  source_system text not null
    check (length(btrim(source_system)) between 1 and 160),
  external_id text not null
    check (length(btrim(external_id)) between 1 and 160),
  created_at timestamptz not null default now(),
  foreign key (batch_id,organization_id)
    references public.enterprise_import_batches(id,organization_id),
  unique (organization_id,source_system,external_id),
  unique (organization_id,case_id)
);

create index enterprise_case_links_batch_idx
  on public.enterprise_case_links(batch_id);
alter table public.enterprise_case_links enable row level security;
revoke all privileges on public.enterprise_case_links
  from public, anon, authenticated;
-- No client-facing RLS policies or INSERT/UPDATE/DELETE grants. The only
-- writer is the separately reviewed private RPC with per-actor authorization.
-- Membership alone is not equivalent to per-case access.
commit;
