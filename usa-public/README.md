# NexJud USA — Git-connected Netlify public preview

The NexJud USA preview is a **static, English, research-stage website**. It is separate from the Brazilian NexJud application, with no logged-in accounts, case submissions, predictions or live provider calls.

## Dedicated existing Netlify project (do not create another)

- Netlify site: `nexjud-usa`
- Dashboard: https://app.netlify.com/projects/nexjud-usa
- Provisional production URL: `https://nexjud-usa.netlify.app`
- GitHub repository: `HenriqueGuilhermeUx/nexjud`

### Connect native Git continuous deployment (preferred)

Open the **existing** Netlify project (not the Brazilian `nexjud` site):

1. **Project configuration → Developer settings → Continuous deployment → Repository → Link repository**.
2. Choose **GitHub** and authorize/access `HenriqueGuilhermeUx/nexjud`.
3. Set **Production branch** to `feature/usa-courtlistener-predictive-foundation-20261024` (**not** `main`).
4. Set **Base directory** to `usa-public`.
5. Set **Publish directory** to `.` (relative to the base). Set **Build command** to `echo 'NexJud USA static preview'` or use the local `usa-public/netlify.toml`.
6. Confirm the Git-linked production deploy is **Ready** in Netlify. The site URL must return `index.html`, **not** the Brazilian Vite app.
7. Before advertising the site, check `/privacy.html`, `/disclaimer.html`, `/favicon.svg`, noindex and CSP headers.

Once connected, Netlify itself publishes each update pushed to the selected branch. **No Netlify token, ZIP, or GitHub deploy workflow is required.** `.github/workflows/usa-netlify-public-preview.yml` now only runs static safety checks.

Never change the repository/branch/build settings on the Brazilian `nexjud` Netlify project or merge the experimental USA research branch into Brazilian `main` just to publish this static site.

## Reusing the NexJud Brazil Supabase backend

The already-provisioned Brazilian NexJud Supabase project may **physically host** U.S. tables and reuse the existing Auth service **only after** a separate U.S. tenant authorization, RLS, quota, provider rights and privacy review. It is not safe to simply use the Brazilian `profiles`, `subscriptions`, `analysis_history`, `payment_orders` or other business tables.

In the isolated GitHub branch, `docs/usa/postgres/shared-supabase-usa-proposal.sql` defines **USA-prefixed** memberships, entitlements and a server-mediated atomic quota RPC, plus strict access policies. `.github/workflows/usa-shared-supabase-disposable.yml` tests it in **disposable PostgreSQL** only. This is a proposed production schema, **not applied to the live Supabase instance**.

The USA CourtListener Edge Function is still disabled and undeployed. Before enabling shared mode, verify the proposal's actual migration, independent tenancy audit, provider license, U.S. privacy requirements, app role provisioning and OAuth/CORS policy, then set trusted server-only settings:

```text
USA_BACKEND_MODE=shared_nexjud_partition
USA_EXPECTED_SUPABASE_PROJECT_REF=<approved_existing_project_ref>
USA_SHARED_PARTITION_REVIEWED=true
USA_SHARED_SCOPE_APPROVED=true
USA_SUPABASE_URL=https://<approved_existing_project_ref>.supabase.co
USA_SUPABASE_PUBLISHABLE_KEY=<server-configured_publishable_key>
```

These flags alone do not deploy or grant access. Other existing CourtListener feature gates are still enforced. No `service_role`, secret keys or database credentials belong in the website, Vite bundle, Netlify source code, or published HTML.

**Status distinction:** Site Git linking is separate from US authenticated backend rollout. The static preview can go live without touching the production Supabase database. Real USA case research remains blocked until shared-backend conditions are proven.
