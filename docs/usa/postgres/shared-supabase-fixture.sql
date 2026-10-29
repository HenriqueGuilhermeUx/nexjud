-- Synthetic Supabase identity fixture for disposable PostgreSQL 17 only.
-- Never run this in the real NexJud Supabase project.
create role anon nologin;
create role authenticated nologin;
create schema auth;
grant usage on schema auth to authenticated,anon;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid
language sql stable set search_path='' as $$
 select nullif(pg_catalog.current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
revoke all on function auth.uid() from public;
grant execute on function auth.uid() to anon,authenticated;
