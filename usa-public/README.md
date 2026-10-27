# NexJud USA — isolated public preview (research-stage)

Static English-language marketing/preview site, independent from NexJud Brazil. No authentication, live CourtListener/PACER access, case submission, analytics, secrets, paid services or legal outcome predictions.

## Existing Netlify project

- Project name: `nexjud-usa`
- Site id: `10f4b195-c1cc-45d0-a427-2daedcce6890`
- Reserved URL: `https://nexjud-usa.netlify.app`
- Dashboard: https://app.netlify.com/projects/nexjud-usa
- **A new, empty Netlify project is not a completed deploy.**

## Configure Git deployment

Netlify **Site configuration → Build & deploy → Continuous deployment → Link repository** (wording may vary):
- Provider: GitHub
- Repository: `HenriqueGuilhermeUx/nexjud` (public)
- Production branch: `feature/usa-courtlistener-predictive-foundation-20261024` (isolation)
- Base directory: `usa-public`
- Publish directory: `.`
- Build command: `echo 'Static NexJud USA preview'` or blank.
- Confirm that the Brazil project `nexjud` remains linked to its original site/main branch.

Alternatively, deploy **only** the files in `usa-public/` via Netlify Drop into the new `nexjud-usa` project. Never upload the repo root build or the Brazilian NexJud `dist/` to this site.

## Checks before describing the site as live

- Confirm the Netlify deploy status is `ready`.
- Check GET /, /privacy.html, /disclaimer.html and /favicon.svg for HTTP 200.
- Check `Content-Security-Policy`, `X-Frame-Options` and noindex.
- Confirm no live legal prediction, Brazilian Supabase keys or browser network calls.
- Keep `index.html` concept console explicitly marked illustrative.

**No merge of USA research branch into Brazilian main and no production database changes.** The static public preview is separate from the experimental TypeScript research code in `src/intelligence/usa`.
