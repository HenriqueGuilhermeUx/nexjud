#!/usr/bin/env bash
set -euo pipefail
# Disposable PostgreSQL only. Requires F9/F7 schema and PostgreSQL CLI.
# Concurrent sessions race for the same organization + idempotency key.
psql -v ON_ERROR_STOP=1 <<'SQL'
insert into auth.users(id) values ('aaaaaaaa-6666-4666-8666-666666666666');
insert into public.enterprise_organizations(id,name,created_by)
values ('bbbbbbbb-6666-4666-8666-666666666666','Concurrent import test','aaaaaaaa-6666-4666-8666-666666666666');
SQL

run_writer() {
  local fingerprint="$1"
  psql -v ON_ERROR_STOP=1 -v fingerprint="$fingerprint" <<'SQL'
begin;
insert into public.enterprise_import_batches(organization_id,idempotency_key,fingerprint,actor_id,receipt)
values ('bbbbbbbb-6666-4666-8666-666666666666','concurrent-key',
        :'fingerprint','aaaaaaaa-6666-4666-8666-666666666666','{"source":"race"}')
on conflict (organization_id,idempotency_key) do nothing;
commit;
SQL
}
run_writer "sha256:$(printf 'a%.0s' {1..64})" &
pid1=$!
run_writer "sha256:$(printf 'b%.0s' {1..64})" &
pid2=$!
wait "$pid1"
wait "$pid2"

psql -v ON_ERROR_STOP=1 <<'SQL'
do $$
declare n integer; fp text;
begin
 select count(*), min(fingerprint) into n, fp
 from public.enterprise_import_batches
 where organization_id='bbbbbbbb-6666-4666-8666-666666666666'
   and idempotency_key='concurrent-key';
 if n <> 1 then raise exception 'Concurrent requests produced % batches, expected 1',n; end if;
 if fp not in ('sha256:'||repeat('a',64),'sha256:'||repeat('b',64))
 then raise exception 'Unexpected persisted fingerprint'; end if;
end $$;
SQL
