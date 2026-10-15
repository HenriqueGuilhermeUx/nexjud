-- Local PostgreSQL staging only. Run after F7, F8, F10.
-- Proves composite foreign keys reject cross-organization references.
begin;
insert into auth.users(id) values
 ('33333333-3333-4333-8333-333333333333'),
 ('44444444-4444-4444-8444-444444444444');
insert into public.enterprise_organizations(id,name,created_by) values
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','Org C','33333333-3333-4333-8333-333333333333'),
 ('dddddddd-dddd-4ddd-8ddd-dddddddddddd','Org D','44444444-4444-4444-8444-444444444444');
insert into public.enterprise_import_batches
 (id,organization_id,idempotency_key,fingerprint,actor_id,receipt)
values
 ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'batch-c','sha256:' || repeat('a',64),
  '33333333-3333-4333-8333-333333333333','{}');

do $$
declare
  rejected boolean;
begin
  rejected := false;
  begin
    insert into public.enterprise_import_items
      (batch_id,organization_id,external_id,source_system,cnj_digits)
    values
      ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
       'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
       'foreign-case','erp','00000000202682600000');
  exception when foreign_key_violation then
    rejected := true;
  end;
  if not rejected then
    raise exception 'Cross-organization import item was accepted';
  end if;

  rejected := false;
  begin
    insert into public.enterprise_import_audit
      (batch_id,organization_id,actor_id,action)
    values
      ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
       'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
       '44444444-4444-4444-8444-444444444444',
       'import_created');
  exception when foreign_key_violation then
    rejected := true;
  end;
  if not rejected then
    raise exception 'Cross-organization audit record was accepted';
  end if;

  insert into public.enterprise_import_items
    (batch_id,organization_id,external_id,source_system,cnj_digits)
  values
    ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
     'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
     'valid-case','erp','00000000202682600000');
end $$;
rollback;
