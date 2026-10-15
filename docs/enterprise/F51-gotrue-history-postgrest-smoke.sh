#!/usr/bin/env bash
# F51 — Auth-issued GoTrue JWT -> live PostgREST RPC -> disposable PG17.
# Called only from F43 after both users created imported cases. Never production.
set -euo pipefail
: "${OWNER_JWT:?local owner token required}"
: "${READER_JWT:?local reader token required}"
: "${OWNER_ID:?local owner UUID required}"
: "${READER_ID:?local reader UUID required}"
BASE="http://127.0.0.1:3017"
ORG="c9191919-1919-4919-8919-191919191919"
OUT=$(mktemp)
trap 'rm -f "$OUT"' EXIT

history() {
  local bearer="$1" body
  if [ "$#" -ge 2 ]; then
    body="$2"
  else
    body=$(printf '{"p_organization":"%s","p_limit":20}' "$ORG")
  fi
  curl -sS -o "$OUT" -w '%{http_code}' --max-time 15 \
    -X POST "$BASE/rpc/enterprise_import_history" \
    -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $bearer" -d "$body"
}
expect() {
  local got="$1" expected="$2" label="$3"
  if [ "$got" != "$expected" ]; then
    echo "$label: expected HTTP $expected but got $got"
    cat "$OUT"
    exit 1
  fi
  echo "$label: HTTP $expected"
}
assert_rows() {
  local who="$1" deleted="${2:-none}"
  python3 - "$OUT" "$who" "$deleted" <<'PY'
import json,sys
rows=json.load(open(sys.argv[1]))
who=sys.argv[2]
deleted=sys.argv[3]
expected={
 "owner":{"gotrue-verified-1","gotrue-edge-handler-1"},
 "reader":{"gotrue-verified-reader"},
}[who]
assert isinstance(rows,list) and len(rows)==len(expected),(who,rows)
found=set()
for row in rows:
    assert isinstance(row,dict),row
    assert set(row)=={"batchId","idempotencyKey","itemCount","linkedCaseCount","createdAt"},row
    assert isinstance(row["batchId"],str) and row["batchId"]
    assert isinstance(row["createdAt"],str) and row["createdAt"]
    assert type(row["itemCount"]) is int and row["itemCount"]==1,row
    assert type(row["linkedCaseCount"]) is int,row
    desired=0 if row["idempotencyKey"]==deleted else 1
    assert row["linkedCaseCount"]==desired,row
    found.add(row["idempotencyKey"])
assert found==expected,(who,found)
print(f"{who}: actor-private history, count and no internal columns PASS")
PY
}

status=$(history "$OWNER_JWT")
expect "$status" 200 "Owner reads only own imported batches"
assert_rows owner

# Membership was revoked during F43; existing valid JWT must lose access now.
status=$(history "$READER_JWT")
expect "$status" 403 "Revoked member cannot read history"

# Re-grant test-only membership to prove even two authorized members of the
# SAME organization cannot enumerate each other's batch keys/receipts.
psql -v ON_ERROR_STOP=1 -v reader="$READER_ID" <<'SQL'
insert into public.enterprise_memberships(organization_id,user_id,role)
values ('c9191919-1919-4919-8919-191919191919', :'reader'::uuid,'legal');
SQL
status=$(history "$READER_JWT")
expect "$status" 200 "Second permitted actor reads only own history"
assert_rows reader

status=$(history "$OWNER_JWT" "{\"p_organization\":\"$ORG\",\"p_limit\":51}")
expect "$status" 400 "History rejects limit above 50"
status=$(history "$OWNER_JWT" '{"p_organization":"d1111111-1111-4111-8111-111111111111","p_limit":20}')
expect "$status" 403 "Wrong organization denied even with valid JWT"

# Negative anonymous and invalid-token tests: status can be 401 or 404
# depending on PostgREST's API privilege masking, but never success.
status=$(curl -sS -o "$OUT" -w '%{http_code}' --max-time 15 \
  -X POST "$BASE/rpc/enterprise_import_history" \
  -H 'Content-Type: application/json' \
  -d "{\"p_organization\":\"$ORG\",\"p_limit\":20}")
if [ "$status" = 200 ] || [ "$status" = 201 ]; then
  echo "Anonymous client read private history"; exit 1
fi
status=$(history "invalid.jwt.value")
if [ "$status" = 200 ] || [ "$status" = 201 ]; then
  echo "Forged JWT read private history"; exit 1
fi

# Authenticate with the same still-valid reader JWT following revocation.
psql -v ON_ERROR_STOP=1 -v reader="$READER_ID" <<'SQL'
delete from public.enterprise_memberships
where organization_id='c9191919-1919-4919-8919-191919191919'
  and user_id=:'reader'::uuid;
SQL
status=$(history "$READER_JWT")
expect "$status" 403 "Repeated revocation blocks still-valid JWT"

# A legitimate legacy case DELETE removes its link, not audit or batch.
deleted=$(psql -v ON_ERROR_STOP=1 -v owner="$OWNER_ID" -At <<'SQL'
with deleted as (
  delete from public.legal_cases
  where user_id=:'owner'::uuid
    and metadata->'enterpriseImport'->>'externalId'='gotrue-case'
  returning id
) select count(*) from deleted;
SQL
)
if [ "$deleted" != 1 ]; then
  echo "Owner case deletion fixture matched $deleted cases, expected 1"
  exit 1
fi
status=$(history "$OWNER_JWT")
expect "$status" 200 "Owner history available after case deletion"
assert_rows owner gotrue-verified-1
remaining=$(psql -v ON_ERROR_STOP=1 -v owner="$OWNER_ID" -At <<'SQL'
select count(*) from public.enterprise_import_batches where actor_id=:'owner'::uuid;
SQL
)
if [ "$remaining" != 2 ]; then
  echo "Deleting a case removed persisted batch evidence"; exit 1
fi

# A client must NOT be able to read private internal tables directly.
for relation in enterprise_import_batches enterprise_case_links enterprise_import_audit; do
  status=$(curl -sS -o "$OUT" -w '%{http_code}' --max-time 15 \
    "$BASE/$relation?select=*" -H "Authorization: Bearer $OWNER_JWT")
  if [ "$status" = 200 ] || [ "$status" = 206 ]; then
    echo "Private table $relation unexpectedly readable over HTTP"; exit 1
  fi
done
echo "GoTrue real session + history HTTP + tenant isolation + revocation + case deletion PASS"
