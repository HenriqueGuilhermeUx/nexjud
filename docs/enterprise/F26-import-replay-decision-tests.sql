-- Disposable PostgreSQL only. Tests read-only replay decision against persisted receipt.
-- This is not an exposed RPC or HTTP endpoint.
begin;
insert into auth.users(id) values ('aaaaaaaa-7777-4777-8777-777777777777');
insert into public.enterprise_organizations(id,name,created_by)
values ('bbbbbbbb-7777-4777-8777-777777777777','Replay decision tenant','aaaaaaaa-7777-4777-8777-777777777777');
insert into public.enterprise_import_batches(id,organization_id,idempotency_key,fingerprint,actor_id,receipt)
values ('cccccccc-7777-4777-8777-777777777777',
        'bbbbbbbb-7777-4777-8777-777777777777','replay-key',
        'sha256:'||repeat('a',64),'aaaaaaaa-7777-4777-8777-777777777777',
        '{"batchId":"cccccccc-7777-4777-8777-777777777777","accepted":1}');

do $$
declare
 original_receipt jsonb;
 replay_receipt jsonb;
 existing_fingerprint text;
 n integer;
begin
 select fingerprint,receipt into existing_fingerprint,original_receipt
 from public.enterprise_import_batches
 where organization_id='bbbbbbbb-7777-4777-8777-777777777777'
   and idempotency_key='replay-key';
 if existing_fingerprint <> 'sha256:'||repeat('a',64)
 then raise exception 'Original fingerprint mismatch'; end if;
 replay_receipt := original_receipt;
 if replay_receipt is distinct from
    '{"batchId":"cccccccc-7777-4777-8777-777777777777","accepted":1}'::jsonb
 then raise exception 'Replay did not return persisted receipt'; end if;
 if existing_fingerprint = 'sha256:'||repeat('b',64)
 then raise exception 'Different fingerprint incorrectly classified as replay'; end if;
 select count(*) into n from public.enterprise_import_batches
 where organization_id='bbbbbbbb-7777-4777-8777-777777777777' and idempotency_key='replay-key';
 if n <> 1 then raise exception 'Replay decision changed batch count'; end if;
end $$;
rollback;
