#!/usr/bin/env bash
# Disposable Supabase Auth (GoTrue) + PostgREST integration.
# F41 starts disposable PostgREST and supplies its test JWT secret.
# No user accounts, tokens or data from production are ever used here.
set -euo pipefail
: "${JWT_SECRET:?missing disposable JWT secret}"
IMAGE="supabase/gotrue:v2.196.0"
NAME="nexjud-ci-gotrue"
DB="nexjud_gotrue_ci"
AUTH="http://127.0.0.1:9999"
API="http://127.0.0.1:3017"
RESPONSE=$(mktemp)
cleanup() {
  docker rm -f "$NAME" >/dev/null 2>&1 || true
  rm -f "$RESPONSE"
}
trap cleanup EXIT
psql -v ON_ERROR_STOP=1 -c "create database $DB"
psql -v ON_ERROR_STOP=1 -d "$DB" -c 'create schema if not exists auth'
# Migration grants depend on the standard Supabase roles, not user data.
psql -v ON_ERROR_STOP=1 <<'SQL'
do $roles$
begin
 if not exists(select 1 from pg_roles where rolname='service_role')
 then create role service_role nologin; end if;
 if not exists(select 1 from pg_roles where rolname='supabase_auth_admin')
 then create role supabase_auth_admin nologin; end if;
 if not exists(select 1 from pg_roles where rolname='supabase_admin')
 then create role supabase_admin nologin; end if;
end $roles$;
SQL
ENV_OPTS=(
  -e GOTRUE_DB_DRIVER=postgres
  -e "GOTRUE_DB_DATABASE_URL=postgres://postgres:local-only@127.0.0.1:5432/$DB?search_path=auth"
  -e GOTRUE_DB_NAMESPACE=auth
  -e GOTRUE_API_HOST=0.0.0.0
  -e GOTRUE_API_PORT=9999
  -e API_EXTERNAL_URL=http://127.0.0.1:9999
  -e GOTRUE_SITE_URL=http://127.0.0.1:3000
  -e "GOTRUE_JWT_SECRET=$JWT_SECRET"
  -e GOTRUE_JWT_AUD=authenticated
  -e GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated
  -e GOTRUE_EXTERNAL_EMAIL_ENABLED=true
  -e GOTRUE_MAILER_AUTOCONFIRM=true
  -e GOTRUE_DISABLE_SIGNUP=false
)
docker run --rm --network host "${ENV_OPTS[@]}" "$IMAGE" gotrue migrate
docker run -d --rm --network host --name "$NAME" "${ENV_OPTS[@]}" "$IMAGE" gotrue serve >/dev/null
ready=0
for attempt in $(seq 1 35); do
  status=$(curl -s -o /dev/null -w '%{http_code}' --max-time 1 "$AUTH/health" || true)
  if [ "$status" = 200 ]; then ready=1; break; fi
  sleep 1
done
if [ "$ready" != 1 ]; then
  echo "Disposable GoTrue did not become ready"
  docker logs "$NAME" 2>&1 | tail -n 35
  exit 1
fi
signup() {
  local email="$1"
  local payload
  payload=$(printf '{"email":"%s","password":"NexJud-CI-Only-Password-2026"}' "$email")
  curl -sS --fail-with-body --max-time 15 -X POST "$AUTH/signup" \
    -H 'Content-Type: application/json' -d "$payload" > "$RESPONSE"
  curl -sS --fail-with-body --max-time 15 -X POST "$AUTH/token?grant_type=password" \
    -H 'Content-Type: application/json' -d "$payload" > "$RESPONSE"
  python3 - "$RESPONSE" <<'PY'
import json,sys
data=json.load(open(sys.argv[1]))
assert isinstance(data.get("access_token"),str) and data["access_token"], "GoTrue issued no token"
print(data["access_token"])
PY
}
OWNER_JWT=$(signup "nexjud-owner@ci.invalid")
READER_JWT=$(signup "nexjud-reader@ci.invalid")
user_id() {
 curl -sS --fail-with-body --max-time 15 "$AUTH/user" \
    -H "Authorization: Bearer $1" >"$RESPONSE"
 python3 - "$RESPONSE" <<'PY'
import json,re,sys
uid=json.load(open(sys.argv[1]))["id"]
assert re.fullmatch(r"[0-9a-f-]{36}",uid), "Invalid UUID from disposable Auth"
print(uid)
PY
}
OWNER_ID=$(user_id "$OWNER_JWT")
READER_ID=$(user_id "$READER_JWT")
psql -v ON_ERROR_STOP=1 -v owner="$OWNER_ID" -v reader="$READER_ID" <<'SQL'
insert into auth.users(id) values (:'owner'::uuid),(:'reader'::uuid);
insert into public.enterprise_memberships(organization_id,user_id,role) values
 ('c9191919-1919-4919-8919-191919191919',:'owner'::uuid,'legal'),
 ('c9191919-1919-4919-8919-191919191919',:'reader'::uuid,'reader');
SQL
BODY='{"p_organization":"c9191919-1919-4919-8919-191919191919","p_key":"gotrue-verified-1","p_items":[{"externalId":"gotrue-case","sourceSystem":"gotrue-local","cnjDigits":"00000000002026826000"}]}'
call() {
  local bearer="$1"
  curl -sS -o "$RESPONSE" -w '%{http_code}' --max-time 15 \
    -X POST "$API/rpc/enterprise_import_cases" \
    -H "Authorization: Bearer $bearer" \
    -H 'Content-Type: application/json' -d "$BODY"
}
expect() {
  local actual="$1" expected="$2" label="$3"
  if [ "$actual" != "$expected" ]; then
    echo "$label: expected HTTP $expected, got $actual"
    cat "$RESPONSE"
    exit 1
  fi
  echo "$label: HTTP $expected"
}
code=$(call "$OWNER_JWT")
expect "$code" 200 "GoTrue-signed import"
python3 - "$RESPONSE" <<'PY'
import json,sys
response=json.load(open(sys.argv[1]))
assert response["status"]=="created" and response["receipt"]["itemCount"]==1
PY
code=$(call "$OWNER_JWT")
expect "$code" 200 "GoTrue-signed idempotent replay"
python3 - "$RESPONSE" <<'PY'
import json,sys
assert json.load(open(sys.argv[1]))["status"]=="already_processed"
PY
code=$(call "$READER_JWT")
expect "$code" 403 "GoTrue-signed reader forbidden"
code=$(call "invalid.jwt.value")
if [ "$code" = 200 ] || [ "$code" = 201 ]; then
  echo "Forged token gained import access"
  exit 1
fi
psql -v ON_ERROR_STOP=1 -v owner="$OWNER_ID" <<'SQL'
do $assert$
begin
  if (select count(*) from public.legal_cases
    where user_id=:'owner'::uuid) <> 1
  then raise exception 'GoTrue token import did not create exactly one owned case'; end if;
end $assert$;
SQL
echo "GoTrue Auth + signed JWT + PostgREST + Enterprise SQL PASS"
