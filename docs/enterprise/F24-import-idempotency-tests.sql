-- Disposable PostgreSQL ONLY. Exercises database uniqueness guarantees.
-- Does not implement the server-side replay receipt/conflict response.
begin;
insert into auth.users(id) values
 ('aaaaaaaa-5555-4555-8555-555555555555'),
 ('bbbbbbbb-5555-4555-8555-555555555555');
insert into public.enterprise_organizations(id,name,created_by) values
 ('cccccccc-5555-4555-8555-555555555555','Idempotency A','aaaaaaaa-5555-4555-8555-555555555555'),
 ('dddddddd-5555-4555-8555-555555555555','Idempotency B','bbbbbbbb-5555-4555-8555-555555555555');
insert into public.enterprise_import_batches(id,organization_id,idempotency_key,fingerprint,actor_id,receipt)
values ('eeeeeeee-5555-4555-8555-555555555555',
        'cccccccc-5555-4555-8555-555555555555','same-key',
        'sha256:'||repeat('a',64),'aaaaaaaa-5555-4555-8555-555555555555','{"batch":"original"}');

do $$
declare rejected boolean := false; n integer;
begin
 begin
  insert into public.enterprise_import_batches(organization_id,idempotency_key,fingerprint,actor_id,receipt)
  values ('cccccccc-5555-4555-8555-555555555555','same-key',
          'sha256:'||repeat('a',64),'aaaaaaaa-5555-4555-8555-555555555555','{"batch":"duplicate"}');
 exception when unique_violation then rejected := true;
 end;
 if not rejected then raise exception 'Same tenant duplicate key accepted'; end if;
 rejected := false;
 begin
  insert into public.enterprise_import_batches(organization_id,idempotency_key,fingerprint,actor_id,receipt)
  values ('cccccccc-5555-4555-8555-555555555555','same-key',
          'sha256:'||repeat('b',64),'aaaaaaaa-5555-4555-8555-555555555555','{"batch":"conflict"}');
 exception when unique_violation then rejected := true;
 end;
 if not rejected then raise exception 'Same key different fingerprint accepted'; end if;
 select count(*) into n from public.enterprise_import_batches
 where organization_id='cccccccc-5555-4555-8555-555555555555' and idempotency_key='same-key';
 if n <> 1 then raise exception 'Duplicate attempt changed original batch count'; end if;
 if (select fingerprint from public.enterprise_import_batches
     where organization_id='cccccccc-5555-4555-8555-555555555555' and idempotency_key='same-key')
    <> 'sha256:'||repeat('a',64)
 then raise exception 'Original fingerprint was altered'; end if;
end $$;

insert into public.enterprise_import_batches(id,organization_id,idempotency_key,fingerprint,actor_id,receipt)
values ('ffffffff-5555-4555-8555-555555555555',
        'dddddddd-5555-4555-8555-555555555555','same-key',
        'sha256:'||repeat('b',64),'bbbbbbbb-5555-4555-8555-555555555555','{"batch":"other-tenant"}');
do $$
begin
 if (select count(*) from public.enterprise_import_batches where idempotency_key='same-key') <> 2
 then raise exception 'Distinct tenants could not reuse same idempotency key'; end if;
end $$;
rollback;
