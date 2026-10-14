-- LOCAL DISPOSABLE POSTGRES ONLY; never run on a Supabase project.
-- Must be applied before F14; imitates auth.uid() using a test-only claim.
begin;
create or replace function auth.uid()
returns uuid
language sql stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
commit;
