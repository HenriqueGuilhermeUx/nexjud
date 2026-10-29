# NexJud USA — emergency pilot suspension

**2026-10-28 · PR-only design and disposable PostgreSQL tests; NOT deployed.**

The U.S. pilot can be suspended without changing the NexJud Brazil app,
Supabase tables, payment service or Auth users. This is not a production
security runbook until independently reviewed, deployed and exercised.

## Emergency operation (synthetic only)

- A dedicated, `NOLOGIN` database role, `usa_legal_pilot_suspender`,
  may call only `usa_legal_internal.suspend_pilot_only(tenant_uuid,
  reason_evidence_sha256)`. No `anon`, `authenticated` or earlier
  provisioning/reviewer/activation roles receive this function.
- Function requires a previously activated, currently **active** U.S.
  tenant and syntactically valid evidence digest different from prior
  security and release approval digests. The digest itself is not a
  cryptographic human authorization or an externally audited record.
- The function locks the tenant row and atomically sets tenant
  `disabled`, active US memberships `revoked`, research entitlements
  disabled and quota to 0, then writes a private audit record with the
  previous research entitlement and remaining quota.
- The record is append-only for ordinary operations via a trigger,
  but database owners and superusers can still alter it. A second
  suspension is rejected; previous approval receipts cannot simply
  re-enable this tenant.
- The `usa_legal_pilot_access_ready` server-side database check should
  return false on the next authorized access after suspension. The
  entitlement and quota checks must deny subsequent legal searches.

**Important limitations:** A pre-existing Supabase JWT does not magically
expire on tenant suspension. Requests already authorized or in flight may
complete. A production emergency workflow also needs an administrative
session-revocation procedure, short access-token lifetime, enforcement
at *every* sensitive endpoint and external audit evidence. No claims of
instant network-wide revocation or legal-research readiness should be made.

## Verification

The isolated CI installs
`docs/usa/postgres/shared-supabase-pilot-suspension-proposal.sql`
**only in disposable PostgreSQL 17** after running prior synthetic
provisioning, approval and concurrency test cases. Contract tests enforce
access denial, syntactic evidence validation, replay rejection, no direct
administrator table writes, no cross-tenant change, no remaining research
quota, and retained audit history.

The live Brazil Supabase currently has none of these proposed US objects.
Do **not** run the proposal on Brazil production without a separate
migration change review, security approvals, operator role design,
recovery plan and customer privacy assessment.
