#!/usr/bin/env bash
# Disposable PostgreSQL only. Run after F9 (auth fixture) and F7 (draft schema).
set -euo pipefail

assert_grant_detected() {
  local grant_sql="$1" table="$2" log
  log="$(mktemp)"
  # -c and -f run in the same connection. ON_ERROR_STOP terminates on the
  # expected assertion failure; the transaction is then rolled back.
  if psql -v ON_ERROR_STOP=1 \
      -c "BEGIN; ${grant_sql}" \
      -f docs/enterprise/F8-staging-catalog-assertions.sql >"$log" 2>&1; then
    cat "$log"
    rm -f "$log"
    echo "F8 unexpectedly accepted: ${grant_sql}" >&2
    return 1
  fi
  if ! grep -Fq "Unexpected effective client privileges on ${table}" "$log"; then
    cat "$log"
    rm -f "$log"
    echo "F8 did not identify the exact table: ${table}" >&2
    return 1
  fi
  rm -f "$log"
}

# PUBLIC grants are inherited even if the grantor is not listed as a client.
assert_grant_detected \
  'GRANT SELECT ON public.enterprise_import_items TO PUBLIC;' \
  'enterprise_import_items'
# Verify the assertion checks each target table, not a tautological filter.
assert_grant_detected \
  'GRANT INSERT ON public.enterprise_import_audit TO authenticated;' \
  'enterprise_import_audit'
# Expected failures must have rolled back their temporary GRANTs.
psql -v ON_ERROR_STOP=1 -f docs/enterprise/F8-staging-catalog-assertions.sql
