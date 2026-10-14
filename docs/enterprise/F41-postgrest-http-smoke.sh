#!/usr/bin/env bash
# F41: real JWT -> PostgREST -> disposable PostgreSQL transaction smoke.
# Never use production credentials, DB hosts, or user data here.
set -euo pipefail
BASE="http://127.0.0.1:3017"
SECRET="NexJudPostgRESTDisposableTestSecretOnly2026"
NAME="nexjud-pgrst-disposable"
cleanup() { docker logs "$NAME" 2>&1 | tail -n 30 || true; docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT
psql -v ON_ERROR_STOP=1 <<'SQL'
create role nexjud_http_fixture login password 'test-only-http-db-pw' noinherit;
grant anon, authenticated to nexjud_http_fixture;
insert into auth.users(id) values
 ('a7171717-1717-4717-8717-171717171717'),
 ('b8181818-1818-4818-8818-181818181818');
insert into public.enterprise_organizations(id,name,created_by)
 values ('c9191919-1919-4919-8919-191919191919','HTTP-only tenant','a7171717-1717-4717-8717-171717171717');
insert into public.enterprise_memberships(organization_id,user_id,role) values
 ('c9191919-1919-4919-8919-191919191919','a7171717-1717-4717-8717-171717171717','admin'),
 ('c9191919-1919-4919-8919-191919191919','b8181818-1818-4818-8818-181818181818','reader');
SQL
docker run -d --rm --net host --name "$NAME" \
 -e PGRST_DB_URI="postgres://nexjud_http_fixture:test-only-http-db-pw@127.0.0.1:5432/postgres" \
 -e PGRST_DB_SCHEMAS=public \
 -e PGRST_DB_ANON_ROLE=anon \
 -e PGRST_JWT_SECRET="$SECRET" \
 -e PGRST_SERVER_PORT=3017 \
 postgrest/postgrest:v12.2.8 >/dev/null
ready=0
for i in $(seq 1 40); do
 status=$(curl -s -o /dev/null -w '%{http_code}' --max-time 1 "$BASE/" || true)
 if [ "$status" != "000" ]; then ready=1; break; fi
 sleep 1
done
[ "$ready" = 1 ] || { echo "PostgREST did not start"; exit 1; }
token() {
 JWT_USER="$1" JWT_SECRET="$SECRET" python3 - <<'PY'
import base64, hashlib, hmac, json, os, time
enc=lambda x:base64.urlsafe_b64encode(json.dumps(x,separators=(',',':')).encode()).decode().rstrip('=')
head=enc({"alg":"HS256","typ":"JWT"})
claims=enc({"role":"authenticated","sub":os.environ["JWT_USER"],"exp":int(time.time())+1200})
body=head+"."+claims
sig=base64.urlsafe_b64encode(hmac.new(os.environ["JWT_SECRET"].encode(),body.encode(),hashlib.sha256).digest()).decode().rstrip("=")
print(body+"."+sig)
PY
}
ADMIN_TOKEN=$(token 'a7171717-1717-4717-8717-171717171717')
READER_TOKEN=$(token 'b8181818-1818-4818-8818-181818181818')
PAYLOAD='{"p_organization":"c9191919-1919-4919-8919-191919191919","p_key":"http-smoke-1","p_items":[{"externalId":"http-one","sourceSystem":"smoke","cnjDigits":"00000000002026826000"}]}'
OUT=$(mktemp)
call() {
 local jwt="$1" data="$2"
 curl -sS -o "$OUT" -w '%{http_code}' --max-time 15 \
  -X POST "$BASE/rpc/enterprise_import_cases" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $jwt" -d "$data"
}
status=$(call "$ADMIN_TOKEN" "$PAYLOAD")
[ "$status" = 200 ] || { echo "Create returned $status: $(cat "$OUT")"; exit 1; }
python3 - "$OUT" <<'PY'
import json,sys
v=json.load(open(sys.argv[1]))
assert v["status"]=="created" and v["receipt"]["itemCount"]==1,v
PY
status=$(call "$ADMIN_TOKEN" "$PAYLOAD")
[ "$status" = 200 ] || { echo "Replay returned $status: $(cat "$OUT")"; exit 1; }
python3 - "$OUT" <<'PY'
import json,sys
v=json.load(open(sys.argv[1]))
assert v["status"]=="already_processed",v
PY
changed="${PAYLOAD/http-one/http-two}"
status=$(call "$ADMIN_TOKEN" "$changed")
[ "$status" = 409 ] || { echo "Fingerprint conflict unexpectedly returned $status: $(cat "$OUT")"; exit 1; }
status=$(call "$READER_TOKEN" "${PAYLOAD/http-one/reader-one}")
[ "$status" = 403 ] || { echo "Reader was not forbidden: $status $(cat "$OUT")"; exit 1; }
status=$(curl -sS -o "$OUT" -w '%{http_code}' --max-time 15 \
 -X POST "$BASE/rpc/enterprise_import_cases" \
 -H 'Content-Type: application/json' -d "$PAYLOAD")
[ "$status" != 200 ] && [ "$status" != 201 ] || { echo "Anonymous import was allowed"; exit 1; }
psql -v ON_ERROR_STOP=1 <<'SQL'
do $verify$
begin
 if (select count(*) from public.legal_cases
     where user_id='a7171717-1717-4717-8717-171717171717') <> 1
 then raise exception 'HTTP import failed to create exactly one case'; end if;
 if (select count(*) from public.enterprise_import_audit
     where organization_id='c9191919-1919-4919-8919-191919191919') <> 1
 then raise exception 'HTTP replay/conflict modified audit'; end if;
end $verify$;
SQL
echo "JWT/HTTP/PostgREST/PostgreSQL isolated import contract PASS"
# Run the ACTUAL TypeScript handler against this same disposable PostgREST
# instance. Fake identity only; authorization is still enforced by SQL JWT.
ADMIN_TOKEN="$ADMIN_TOKEN" READER_TOKEN="$READER_TOKEN" \
 deno run --allow-net=127.0.0.1:3017 --allow-env=ADMIN_TOKEN,READER_TOKEN \
 docs/enterprise/F42-edge-handler-postgrest-smoke.ts
psql -v ON_ERROR_STOP=1 <<'SQL'
do $verify$
begin
 if (select count(*) from public.legal_cases
   where user_id='a7171717-1717-4717-8717-171717171717') <> 2
 then raise exception 'handler HTTP gateway did not create exactly one more case'; end if;
 if (select count(*) from public.enterprise_import_audit
   where organization_id='c9191919-1919-4919-8919-191919191919') <> 2
 then raise exception 'handler replay/conflict mutated import audit'; end if;
end $verify$;
SQL
echo "Enterprise TypeScript handler + PostgREST + PostgreSQL smoke PASS"
