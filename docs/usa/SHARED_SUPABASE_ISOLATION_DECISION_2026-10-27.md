# NexJud USA — shared Supabase infrastructure, isolated US data

**Engineering decision — October 27, 2026. Review-only. No live production migration or deploy.**

The existing Brazilian NexJud Supabase project is operational. It can in principle
host **a separate U.S. data partition** inside the same PostgreSQL instance,
and share the Supabase Auth service. Shared physical hosting is NOT permission
to share Brazilian clients, cases, evidence, analytics or subscription
entitlements with the US application.

## Already validated in the current repository

- The Brazilian React application uses `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY` in `src/lib/supabase.ts` and queries existing
  Brazilian `public.profiles`, `subscriptions`, `analysis_history` and
  `favorites`. **Do not reuse this frontend or its prediction API in USA.**
- The existing US server module `usa-courtlistener-search` already expects
  an active `usa_legal_memberships`, `usa_legal_research_entitlements`,
  and `usa_legal_search_consume_quota` RPC. These are NOT currently
  installed in the Brazilian project's public schema (read-only inspection).
- The existing project's public tables have RLS enabled. **That alone does
  not establish US tenant isolation** or a cross-tenant authorization audit.
- The USA research code and public landing are not live APIs; the CourtListener
  endpoint is disabled by default.

## Shared-backend adaptation in the isolated branch

- `docs/usa/postgres/shared-supabase-usa-proposal.sql` creates **only new**
  USA-prefixed tables in the shared public schema (required by the current
  Supabase client Data API): tenants, memberships, research entitlements,
  quotas. A separate private `usa_legal_internal` schema implements the
  atomic quota update.
- Default rights are none, with narrowly permitted authenticated SELECT of
  own active membership and its entitlements. No direct access to the
  quota table is granted to `authenticated` or `anon`.
- The public RPC `usa_legal_search_consume_quota` is `SECURITY INVOKER`;
  it delegates to a private vetted `SECURITY DEFINER` helper that checks
  `auth.uid()`, membership, active US tenant, permissioned role,
  entitlement expiry and a remaining positive quota before atomically
  decrementing. A Brazil user without US membership is denied.
- `src/intelligence/usa/sharedBackendConfig.ts` and the existing
  US CourtListener Edge Function enforce exact Supabase project URL,
  server-only publishable key, a separately pinned Brazilian project reference (which must match in shared mode and differ in dedicated mode), and explicitly reviewed shared mode. If
  `USA_SHARED_PARTITION_REVIEWED` or `USA_SHARED_SCOPE_APPROVED`
  is not `true`, the integration fails closed.
- The isolated CI `usa-shared-supabase-disposable.yml` uses a
  **synthetic PostgreSQL 17** fixture to test role visibility, no-membership
  denial, quota exhaustion, direct table grants, and concurrent quota use.
  No migration was applied to the real NexJud database.

## Mandatory approvals before a live shared-project rollout

1. Independent security review of RLS, `SECURITY DEFINER` boundaries,
   SQL grants, operator role provisioning and Supabase Auth redirect URLs.
2. Dedicated US tenant membership onboarding and access lifecycle,
   including review of existing Brazilian identities to avoid privilege bleed.
3. Separation of US vs. Brazil file storage, audit trails, AI providers,
   payment/billing, legal matter records and support staff permissions.
4. CourtListener/RECAP/PACER/FJC data source rights, privacy obligations
   and financial/operational quota limits.
5. Backup, PITR, schema-change review, rollback readiness, test tenant
   sign-in, negative authorization tests, and an independent review of
   the actual production DB configuration.
6. Only after these passes: enable server-side feature flags. Never place
   credentials or a Supabase `service_role` key in Netlify public assets.

## Netlify Git continuous deployment is separate

The `nexjud-usa` Netlify project should be linked to
`HenriqueGuilhermeUx/nexjud`, USA branch, base directory `usa-public`.
The landing can be published immediately as a **static research preview**,
and does not require Supabase credentials.

This is **not** approval to deploy unfinished legal prediction features or
intermix U.S./Brazil records.

## Operator-only onboarding prototype (not applied to production)

- `docs/usa/postgres/shared-supabase-provisioning-proposal.sql` adds a narrowly scoped **NOLOGIN** `usa_legal_provisioner` operator role and a private, explicitly authorized `SECURITY DEFINER` function. These are proposal-only SQL objects in ephemeral PostgreSQL, **not live Supabase roles or grants**.
- `provision_disabled_tenant` checks that a synthetic Auth user exists and a 64-character approval-evidence SHA-256 was supplied, then atomically creates a **disabled** US tenant, **pending** owner membership, **disabled** research entitlement, **zero** initial quota and a private provisioning evidence record. None of these steps activates a feature or authenticates a human reviewer.
- A private `usa_legal_internal.provisioning_events` table retains the approval-evidence digest, linked tenant and declared owner. An UPDATE/DELETE trigger rejects routine changes; DB administrators retain power to alter storage, so no claim of independently immutable audit custody is made.
- No `anon` or `authenticated` role can execute onboarding, and the operator has no direct DML grants on USA or Brazilian public tables. The workflow tests explicit denials, duplicate onboarding, invalid evidence, unknown user, atomicity, disabled account visibility and audit mutation refusal.
- A future production administrator identity, restricted connection credential, independently reviewed onboarding evidence, rollback strategy and external audit storage are still mandatory. Do not apply these proposal files to the live Brazilian Supabase or expose the operator function through REST.
