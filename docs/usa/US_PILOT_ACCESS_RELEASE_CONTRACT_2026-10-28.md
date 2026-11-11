# NexJud USA — authenticated pilot access release contract

**Status: isolated PR only, not a deployed authentication service.**

## Current published vs. isolated components

- The separate public `nexjud-usa` Netlify site is **LIVE** as a static
  institutional preview on `https://nexjud-usa.netlify.app`.
- The production Brazilian NexJud Supabase `nexjud` project is already
  active. **The US-specific membership, entitlement, quota and pilot RPC
  proposals are NOT applied** to that production database.
- A new `supabase/functions/usa-pilot-access/index.ts` server-only function
  is staged in the isolated USA GitHub branch. It is **NOT DEPLOYED**.
- The US CourtListener research function is also staged and disabled.
  No prediction endpoint or individual win/loss probability is released.

## Why a new endpoint exists

A successful Supabase login alone does not authorize an American legal
practice. The pilot-access endpoint allows no user-supplied tenant ID or role.
It requires all of the following, in order:

1. An exact HTTPS web Origin matching `USA_ALLOWED_WEB_ORIGIN`.
2. Server-side `USA_PILOT_ACCESS_ENABLED=true`, a pinned backend project
   reference and explicit shared-partition review approvals.
3. A valid Bearer token checked with Supabase Auth `getUser(token)`.
4. Exactly one active US-only membership row returned under the user's JWT
   and RLS, with an allowlisted database role mapped to the internal
   `firm_admin` / `lawyer` / `researcher` / `other` role vocabulary.
5. The read-only `usa_legal_pilot_access_ready` RPC confirming that the
   US tenant AND membership are both active in the database.

The response contains only `ACTIVE_PILOT`, the normalized role, and
`legalSearchAvailable:false`, `predictiveModelAvailable:false`. A viewer
could access a read-only pilot shell if explicitly added to an active US
tenant, but cannot invoke research (the research policy explicitly denies
the `other` role). Missing configuration returns 503; unauthorized
credentials or membership return 401/403. All outcomes are `no-store`.

No browser or static Netlify build contains a service-role key or private
provider token. The pilot function does not consume quotas, provision new
tenants or use paid legal APIs.

## Prior to any private pilot activation

- Obtain a documented authorization to add ONLY the US-prefixed DB objects
  to the existing Supabase project. Test the exact migration after a backup
  and validate the current Brazil database grants, RLS and active clients.
- Independently review the `SECURITY DEFINER` private helper, grants and
  exposed-schema settings; never expose `usa_legal_internal` in the Data API.
- Configure an operator-only onboarding procedure that starts disabled and
  records reviewed identity/onboarding evidence. Do not enroll live users
  during synthetic testing.
- Review Auth redirect URLs, invitation/email policies, cross-app sessions,
  data retention and US privacy/regulatory responsibilities.
- Set only server-managed flags for the U.S. function; deploy as a *separate*
  `usa-pilot-access` function without editing Brazilian Functions.
- Only after negative auth tests on a private tenant, opt-in testing and a
  separate legal-source license assessment may `USA_COURTLISTENER_ENABLED`
  be considered. **Do not enable legal research merely because pilot login works.**

**CI:** `.github/workflows/usa-shared-supabase-disposable.yml` tests
synthetic US Auth/RLS/RPC and rejected onboarding in ephemeral PostgreSQL 17.
`.github/workflows/usa-courtlistener-ci.yml` compiles both US Edge functions
and tests the server-side role mapping. No real production credentials,
court queries, user records or Brazilian DB writes are used.
