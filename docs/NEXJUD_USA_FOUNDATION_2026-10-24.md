# NexJud USA — CourtListener + Legal Predictive Intelligence Foundation

Status: **isolated foundation / NOT DEPLOYED / NOT VALIDATED FOR PREDICTIVE OUTPUTS**

Date: October 24, 2026. Owner: Alternative Ventures USA.
Repository: `HenriqueGuilhermeUx/nexjud`.
Branch: `feature/usa-courtlistener-predictive-foundation-20261024`.
**Do not merge, enable production, modify Brazil flows, or expose prediction percentages until the acceptance gates are met.**

## Scope

NexJud USA is a first-wave Alternative Ventures USA product alongside MODO, SmartBots, DocWallet, F-Insight, Health Wallet, MyDataMed, NexOffices and MindSteps. The Brazilian NexJud's DataJud/CNJ, banking, billing, apps, routes, environments and customer data remain untouched.

Goal: an English-language professional legal intelligence tool for US lawyers and law firms, covering:
- legal research from verifiable opinions and citations;
- comparisons of genuinely similar cases;
- monitoring of federal dockets where the provider has lawful coverage;
- statistically validated predictive estimates **for narrowly defined case outcomes**, with abstention and model reports;
- drafting assistance strictly under lawyer review.

## Sources (verify license, rights, fees and coverage prior to ingestion)

1. **CourtListener REST v4**: opinions, clusters, dockets, citation graph, PACER/RECAP archive, alerts; authenticating token required for modern APIs. Use server-side access only.
   - https://www.courtlistener.com/help/api/rest/
   - https://www.courtlistener.com/help/api/rest/search/
   - Search: `/api/rest/v4/search/?type=o&q=...`. Source search metadata is **not ground truth outcome labels**.
2. **PACER**: official federal court records, authentication and Case Locator APIs; terms/fees and lawful automated usage must be checked before requests.
   - https://pacer.uscourts.gov/file-case/developer-resources
3. **Federal Judicial Center IDB**: historical federal filings/terminations; useful for baseline durations and broad outcomes after auditing field meanings and population.
   - https://www.fjc.gov/research/federal-court-cases-fjc-integrated-database-1979-present
4. **State courts**: jurisdiction-specific access and licensing; no single nationally complete equivalent to CNJ DataJud. State coverage added after source-by-source review.
5. **Do not integrate Harvard Caselaw Access Project legacy API** (sunset in 2024); historical opinions available via CourtListener.

## Model boundary

No generative model may output probabilities, judge performance scores, or fake citations.

Acceptance path:
1. Choose single narrow target (e.g. federal district civil motions with reliably coded grants/denials) and defined prediction time.
2. Collect documents, timestamps, jurisdiction, court, procedural posture, citation networks and verified outcome labels, with rights to use.
3. Record provider IDs, version, URLs, ingestion timestamp, license/coverage, content hash, deletion/correction status and provenance.
4. Build non-leaking temporal train/test splits by case and court. Include a prevalence baseline, a simple calibrated statistical baseline, and an ablation set.
5. Report calibration curves, Brier/log loss, confidence intervals, subgroup error, support size, class imbalance, and drift.
6. Abstain when evidence is thin, outcome not verified, out of distribution or data rights are unclear. User-facing estimates show time horizon, n, scope, confidence bands and model version.
7. Validate by US legal counsel, data privacy and ethics review; practice-of-law limitations, lawyer confidentiality, court-specific rules and ABA Opinion 512.
8. Controlled professional-only pilot; no generic automatic forecasts.

## Initial code in this branch

`src/intelligence/usa/courtListenerNormalizer.ts`: **pure mapper** for CourtListener v4 *opinion search* results, with provenance-safe URLs and explicit `predictionEligible: false`, `observedOutcome: null`.
`src/intelligence/usa/courtListenerNormalizer.test.ts`: tests for traceability, normalization, unsafe URLs, no snippet-derived outcomes, and deduplication.

**There is no production CourtListener API connection, no token, no database migration, no UI feature enabled, and no trained model** in this foundation.

## Proposed secure integration

- Server-side Edge Function/BFF with explicit authenticated entitlements; credentials only in secrets, never Vite/client env.
- Queries scoped by court/jurisdiction and license, rate limits, paginated fetch, response caching, audit logs, retry strategy, and transparent provider billing.
- Separate US tenant / data residency policy / database tables or schemas with explicit RLS. Do not reuse Brazilian private case data.
- Run adapter contract tests with consented sandbox queries before schema expansion.

## First implementation sprint

- [x] Locate existing NexJud prediction readiness and judicial adapter architecture.
- [x] Map official US federal sources and CourtListener REST v4 fields.
- [x] Create isolated USA branch.
- [x] Add non-predictive CourtListener search normalization and unit tests.
- [ ] CI/test execution on this branch and fixture schema verification against a real authorized API response.
- [ ] CourtListener developer account/token and commercial usage terms.
- [ ] Server-side integration, isolated storage/ingestion and provenance schema.
- [ ] Jurisdiction-specific legal data rights evaluation.
- [ ] Select one narrow prediction label and build audited ground truth.
- [ ] Train, backtest, calibrate and approve before any user-facing probabilities.
- [ ] English UI, privacy terms, billing and verified end-to-end release.

References:
- ABA Formal Opinion 512: https://www.americanbar.org/news/abanews/aba-news-archives/2024/07/aba-issues-first-ethics-guidance-ai-tools/
- Existing audit: `docs/NEXJUD_PREDICTIVE_AUDIT_2026-10-12.md`
- Existing readiness gate: `docs/NEXJUD_PREDICTIVE_READINESS.md`
