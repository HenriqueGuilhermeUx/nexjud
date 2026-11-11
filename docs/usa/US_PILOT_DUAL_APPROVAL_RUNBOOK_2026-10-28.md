# NexJud USA — private pilot activation safety contract

**2026-10-28. ISOLATED PROPOSAL ONLY.** The public landing and synthetic workspace
are published on the dedicated Netlify site. This document describes a
**future** private pilot activation, not a live function or a live database
migration. Brazilian NexJud customer data and all existing Brazil roles,
domains, payment functions and Edge Functions are out of scope.

## Goal

Allow a previously verified U.S. firm/organization to access a **read-only
pilot shell** using Supabase Auth and a U.S.-specific membership. Activation
does **not** authorize CourtListener, PACER, litigation prediction, billing,
data ingestion, judge scoring or legal advice.

## State transitions

1. **Operator onboarding:** the separate `usa_legal_provisioner` role
   creates a `disabled` U.S. tenant, `pending` owner membership, disabled
   `usa_legal_research_entitlements`, quota = 0 and a private onboarding
   evidence digest. This stage alone gives the owner no pilot access.
2. **Security review:** a distinct `usa_legal_security_reviewer` role may
   append one private security evidence digest, only while the tenant is
   disabled and owner pending. It must differ from onboarding evidence.
3. **Release review:** a distinct `usa_legal_release_reviewer` role may
   append one release evidence digest only after security review. Its digest
   must differ from the onboarding and security evidence.
4. **Pilot-only activation:** a separate `usa_legal_pilot_activator` role
   rechecks both gate records and disabled/pending state under a database
   row lock, then atomically flips the tenant + owner membership to active,
   leaving entitlement disabled and quota exactly 0. An activation receipt
   records both evidence hashes.
5. **Read-only access check:** `usa_legal_pilot_access_ready()` returns
   true only for a signed-in user with active membership in an active U.S.
   tenant. The undeployed `usa-pilot-access` Edge Function additionally
   requires explicit server flags, expected project reference and exact
   allowed browser origin. It returns
   `legalSearchAvailable:false` and `predictiveModelAvailable:false`.

All approval and activation functions live in the private
`usa_legal_internal` schema, **not** the exposed Data API. Their NOLOGIN
roles have narrowly granted function permissions and no direct table DML.

## What this is NOT

Approval hashes are opaque input hashes: they do **not** establish that
reviewers exist, that the underlying reviews are genuine, that the evidence
was independently validated or that rights/privacy requirements were met.
A person with PostgreSQL superuser/owner privileges can modify triggers,
tables or history. External attestation, independently archived receipts,
operator credential management, revocation, audit and independent validation
are required to claim real multi-person control.

It also does not separate hosting resources: using one Supabase Postgres
instance still shares infrastructure and failure domains with Brazil.
Privacy, residency, contractual and regulatory review is necessary before
using real U.S. client data.

## Test coverage

`docs/usa/postgres/shared-supabase-pilot-activation-proposal.sql` and
`shared-supabase-pilot-activation-contract-tests.sql` are run by the
disposable Postgres 17 workflow after synthetic identity, US membership,
quotas and disabled onboarding.

Negative tests cover insufficient role grants, early activation,
release-before-security, duplicate approvals, matching approval hashes,
unknown tenants, direct operator table writes, activation replay and
attempted audit history edits. Positive tests check active pilot access while
the search entitlement remains `false` and quota remains zero.

**No production Postgres migration or Edge Function deployment** is
performed as part of this workflow.

## Remaining release prerequisites

Independent audit of RLS/SQL roles and existing Brazil Auth settings,
verified reviewer identity/approvals, authenticated operator tooling, U.S.
pilot tenant legal consent, retention rules, rollback and backup review,
canonical permitted redirect URL, negative test cases on isolated tenant,
and a separately authorized production deployment.

**Do not** run the proposal against the NexJud Brazil database, change
Brazil Auth redirect URLs, merge draft PR #84 or enable live CourtListener
without new approval and change control.
