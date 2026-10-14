-- Disposable PostgreSQL ONLY. Simulates server-authorized writes as postgres.
-- Validates FK failure rollback and successful atomic batch/item/audit commit.
begin;
insert into auth.users(id) values ('aaaaaaaa-4444-4444-8444-444444444444');
insert into public.enterprise_organizations(id,name,created_by) values
 ('bbbbbbbb-4444-4444-8444-444444444444','Atomicity test','aaaaaaaa-4444-4444-8444-444444444444');
insert into public.enterprise_memberships(organization_id,user_id,role) values
 ('bbbbbbbb-4444-4444-8444-444444444444','aaaaaaaa-4444-4444-8444-444444444444','owner');

-- An invalid item in a subtransaction must roll back the batch and audit together.
do $$
declare
 failed boolean := false;
 n integer;
begin
 begin
   insert into public.enterprise_import_batches(id,organization_id,idempotency_key,fingerprint,actor_id,receipt)
   values ('cccccccc-4444-4444-8444-444444444444',
           'bbbbbbbb-4444-4444-8444-444444444444','bad-item',
           'sha256:'||repeat('a',64),'aaaaaaaa-4444-4444-8444-444444444444','{}');
   insert into public.enterprise_import_audit(batch_id,organization_id,actor_id,action)
   values ('cccccccc-4444-4444-8444-444444444444',
           'bbbbbbbb-4444-4444-8444-444444444444',
           'aaaaaaaa-4444-4444-8444-444444444444','import_created');
   insert into public.enterprise_import_items(batch_id,organization_id,external_id,source_system,cnj_digits)
   values ('cccccccc-4444-4444-8444-444444444444',
           'bbbbbbbb-4444-4444-8444-444444444444','bad','test','invalid');
 exception when check_violation then failed := true;
 end;
 if not failed then raise exception 'Invalid item did not fail'; end if;
 select count(*) into n from public.enterprise_import_batches where id='cccccccc-4444-4444-8444-444444444444';
 if n <> 0 then raise exception 'Failed import left batch behind'; end if;
 select count(*) into n from public.enterprise_import_audit where batch_id='cccccccc-4444-4444-8444-444444444444';
 if n <> 0 then raise exception 'Failed import left audit behind'; end if;
end $$;

-- Successful server-side transaction inserts all three records.
insert into public.enterprise_import_batches(id,organization_id,idempotency_key,fingerprint,actor_id,receipt)
values ('dddddddd-4444-4444-8444-444444444444',
        'bbbbbbbb-4444-4444-8444-444444444444','good-item',
        'sha256:'||repeat('b',64),'aaaaaaaa-4444-4444-8444-444444444444','{"count":1}');
insert into public.enterprise_import_items(batch_id,organization_id,external_id,source_system,cnj_digits)
values ('dddddddd-4444-4444-8444-444444444444',
        'bbbbbbbb-4444-4444-8444-444444444444','external-1','test','12345678901234567890');
insert into public.enterprise_import_audit(batch_id,organization_id,actor_id,action)
values ('dddddddd-4444-4444-8444-444444444444',
        'bbbbbbbb-4444-4444-8444-444444444444',
        'aaaaaaaa-4444-4444-8444-444444444444','import_created');
do $$
begin
 if (select count(*) from public.enterprise_import_batches where id='dddddddd-4444-4444-8444-444444444444') <> 1
 or (select count(*) from public.enterprise_import_items where batch_id='dddddddd-4444-4444-8444-444444444444') <> 1
 or (select count(*) from public.enterprise_import_audit where batch_id='dddddddd-4444-4444-8444-444444444444') <> 1
 then raise exception 'Successful import was not complete'; end if;
end $$;
rollback;
