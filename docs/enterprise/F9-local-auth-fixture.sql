-- Local-only compatibility fixture. NEVER run against a real Supabase project.
-- A minimal stand-in for the auth.users FK target, not real Supabase Auth.
begin;
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid()
);
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end $$;
commit;
