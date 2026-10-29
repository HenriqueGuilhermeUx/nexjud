# NexJud USA — restricted pilot sign-in (UNDEPLOYED)

A standalone, U.S.-only Vite application. It is **not** the existing NexJud
Brazil application and **not** part of the published `usa-public/` site.

## Current state

- Entry: `usa-private/index.html`, `usa-private/main.ts`.
- Login controller: `src/intelligence/usa/usPrivatePilotSession.ts`.
- Server-side status: `supabase/functions/usa-pilot-access/index.ts`, currently
  **undeployed**. The U.S. Supabase tenant/membership/RPC schema is also
  **not installed** in the existing Brazilian production project.
- By default, this frontend displays **"Pilot access is not available"** and
  does not construct a Supabase client, transmit credentials or display a form.
- CI performs an offline build using `npx vite build --config
  usa-private/vite.config.ts`. The output is `usa-private/dist/`, which is
  deliberately outside Netlify's `usa-public` deploy directory. Do not
  point the existing Brazilian or public U.S. Netlify project to this build.

## Server approval and opt-in environment (not configured)

Only after a documented U.S. data/RLS/Auth/operational approval and an
independently security-reviewed deployment can a **separately hosted** U.S.
private pilot be configured:

```text
VITE_USA_PILOT_UI_ENABLED=true
VITE_USA_PILOT_SUPABASE_URL=https://<approved-project-ref>.supabase.co
VITE_USA_PILOT_PUBLISHABLE_KEY=<publishable-key-only>
VITE_USA_PILOT_PROJECT_REF=<approved-project-ref>
VITE_USA_PILOT_ORIGIN=https://<explicit-approved-private-site-origin>
```

The `VITE_` variables are **public browser-build values**, not secrets.
Never put `service_role`, `sb_secret_`, Supabase DB passwords, a CourtListener
provider token, case material, or a private key in them. Only use a
`sb_publishable_` key. No real credentials are included in GitHub.

The server-side `usa-pilot-access` function must separately require
`USA_PILOT_ACCESS_ENABLED=true`, exact allowed origin, reviewed tenant
partition and project reference, a valid JWT, active U.S. membership under
RLS, and an active U.S. tenant. The client cannot authorize itself merely
by enabling a `VITE_` flag.

## Authentication behavior

- Email/password sign-in is intended **only for identities previously
  provisioned by authorized operators**. Public sign-up and invitations are
  deliberately not offered.
- The client uses `persistSession:false`, `autoRefreshToken:false` and
  `detectSessionInUrl:false`. It does not reuse the Brazilian application's
  `src/lib/supabase.ts` instance or its local-storage session.
- A successful password sign-in is followed by a live server-side
  `usa-pilot-access` authorization check. If membership is missing, a
  tenant is suspended, or backend config is incomplete, the client signs
  out and denies pilot access.
- The pilot shell offers **no** legal research, model scoring, billing,
  real-court document submission or client case handling.
- Because auth is held in memory and automatic refreshing is disabled,
  the user must sign in again after reloading or when the token expires.
  This does **not** revoke other previously issued Supabase sessions.
  Revocation must be enforced independently on every server request.

## Remaining requirements

A private pilot cannot be launched by a static build alone. Before real
sign-in: independent inspection of the Brazilian shared Supabase project,
U.S.-prefixed schema migration with a rollback strategy, live RLS/grant
negative tests, legitimate U.S. tenant onboarding and operator identities,
review of Auth emails/MFA/password policies/session expiry, configure
allowed origins, deploy the isolated U.S. pilot Edge Function, and validate
revocation in a real test tenant. CourtListener/PACER/FJC service rights and
legal predictions remain separate release gates.

**No merge or production deployment is implied by this directory.**
