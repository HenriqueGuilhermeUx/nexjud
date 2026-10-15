-- PostgreSQL staging ONLY. Must run after F7 and F8.
-- Assert no direct access by authenticated/anon, even with test data.
begin;
insert into auth.users (id) values
 ('11111111-1111-4111-8111-111111111111'),
 ('22222222-2222-4222-8222-222222222222');

insert into public.enterprise_organizations (id,name,created_by) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','Org A','11111111-1111-4111-8111-111111111111'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','Org B','22222222-2222-4222-8222-222222222222');

insert into public.enterprise_memberships (organization_id,user_id,role) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','11111111-1111-4111-8111-111111111111','owner'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','22222222-2222-4222-8222-222222222222','owner');

do $$
declare
  blocked boolean;
begin
  -- Privilege check is deterministic even when postgres superuser bypasses RLS.
  if has_table_privilege('authenticated','public.enterprise_organizations','SELECT')
     or has_table_privilege('authenticated','public.enterprise_memberships','SELECT')
     or has_table_privilege('authenticated','public.enterprise_import_batches','INSERT')
     or has_table_privilege('anon','public.enterprise_organizations','SELECT') then
    raise exception 'Client role unexpectedly has direct enterprise privileges';
  end if;

  -- Per-organization idempotency uniqueness must exist and reject duplicate keys.
  insert into public.enterprise_import_batches
    (organization_id,idempotency_key,fingerprint,actor_id,receipt)
  values
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','key-1','sha256:' || repeat('a',64),'11111111-1111-4111-8111-111111111111','{}');
  blocked := false;
  begin
    insert into public.enterprise_import_batches
      (organization_id,idempotency_key,fingerprint,actor_id,receipt)
    values
      ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','key-1','sha256:' || repeat('b',64),'11111111-1111-4111-8111-111111111111','{}');
  exception when unique_violation then
    blocked := true;
  end;
  if not blocked then
    raise exception 'Duplicate idempotency key accepted within same organization';
  end if;

  -- The same key in a different organization must be permitted.
  insert into public.enterprise_import_batches
    (organization_id,idempotency_key,fingerprint,actor_id,receipt)
  values
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','key-1','sha256:' || repeat('c',64),'22222222-2222-4222-8222-222222222222','{}');
end $$;
rollback;
