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


## Engineering update — 2026-10-24 (nonproduction)

The USA-only branch now also contains:
- `supabase/functions/_shared/usa/courtListenerClient.ts`: server-side-only CourtListener REST v4 search client with first-party URL pinning, bounded cursor pagination (maximum 3 pages), timeout, status-only upstream errors and injectable fetch.
- `src/intelligence/usa/courtListenerClient.test.ts`: unit/contract checks with mocked responses. These cannot count as live provider integration.
- `.github/workflows/usa-courtlistener-ci.yml`: dedicated isolated mock tests on branch pushes/PRs.

**New acceptance distinction:** the shared server client exists, but no authenticated US-facing Edge Function route, entitlements, US database, authorized live provider token, state-law review or integration test is enabled. Do not expose or bundle the API token in React. Before shipping a route, add authenticated US tenant + entitlement checks, per-tenant rate limits, search-query confidentiality controls, budgets, tracing without sensitive payloads, and audit logs. Verify source usage permissions for commercial deployment.

Provider notes confirmed in documentation:
- CourtListener search `type=o` returns opinion clusters; `type=r/d/rd` correspond to different kinds of PACER/RECAP records, which require separate normalizers.
- Cursor follow-up URLs must keep their query parameters unchanged. Search snippets are not disposition ground truth. For monitoring, CourtListener recommends Alerts API rather than polling search.
- PACER PCL has a separate QA environment and production searches may incur fees; access is not inherited by a CourtListener token.

**Test evidence:** a dedicated workflow has been committed. Mark its outcome PASS only after the actual GitHub Actions job reports success. Web/bridge CI success is not a substitute for the USA contract tests.


## FJC IDB time-to-termination cohort increment — 2026-10-25

**Source review:** FJC maintains a longitudinal integrated database with district civil filings, pending and termination cohorts and associated historical codebooks. Reporting timeframes and field meanings can change across years, and prior quarterly records may be replaced or updated. A research snapshot MUST be frozen and hashed before feature extraction; no prospective validation can reuse later snapshots as past information.

- Official FJC source overview: https://www.fjc.gov/research/idb
- FJC federal data description: https://www.id.uscourts.gov/Content_Fetcher/index.cfml/National_Statistics_2710.htm?Content_ID=2710
- Consult the actual edition-specific official FJC codebook before populating field mappings. No current CSV columns are assumed by the implementation.

**Added code**:
- `src/intelligence/usa/fjcCivilCohort.ts` — pure extractor boundary requiring explicit source codebook mapping, digest manifest and analyst attestations; separates observed civil terminations (event=1) from right-censored pending records (event=0), preserving observation days.
- `src/intelligence/usa/fjcCivilCohort.test.ts` — synthetic tests for chronology, duplicate case identities, missing columns, rights flags and censored duration.
- `docs/usa/sql/REVIEW_ONLY_usa_legal_search_boundary.sql` — reference-only US schema for memberships, entitlements and an atomic quota RPC with RLS. This file is deliberately **outside** `supabase/migrations`. It has NOT been executed, probed, or audited against a real US database.

**Statistics guardrails:**
- `terminationObserved=1` means the FJC recorded termination; it **does not** mean that the party won.
- In an observed follow-up window, a pending case is right-censored rather than a zero-duration case.
- The normalized cohort includes only status/provenance data, not training labels for motion outcomes, judge performance or win/loss percentages.
- Accept only frozen, versioned source files and field mappings tied to a verified codebook; a syntactically valid digest string in a manifest is NOT cryptographic verification of source bytes.
- Document inclusion/exclusion populations, filing-vs-terminated selection, duplicate and removed records, observation periods, missingness, case identity stability, truncation, administrative censoring and cross-court drift.
- For any predictive time-to-event model, implement follow-up-aware estimation and temporally held-out evaluation first; DO NOT use terminated-only cases to imply duration for newly filed cases.
- No public probability UI, model trained, live ingestion or real federal court-data analysis has occurred.

### Release gates not satisfied

Actual FJC download and license/use review, codebook mapping, file hash verification, representative source fixtures, RLS SQL migration on *new* US infrastructure, negative authorization tests, statistical dataset audit, model training, temporal backtesting, calibration and external professional review.


## 2026-10-25 — offline source-integrity and temporal-cohort gates

- Added `fjcVerifiedSnapshot.ts`: a bounded, strict UTF-8 JSON-converted extract reader that verifies SHA-256 **of the exact incoming bytes** before parsing and calling the existing FJC normalizer. It deliberately does **not** claim the native FJC distribution is JSON or that it is downloaded; a separately reviewed official-format converter is mandatory.
- Added `fjcTemporalSplit.ts`: separates cases by filing date, excludes the temporal gap, and re-censors **training** case terminations known only after the training cutoff. Validation follow-up remains limited to the frozen source snapshot. Repeated case IDs, snapshot/revision mixing, contradictory event flags and impossible dates fail closed.
- Added tests for substituted JSON, hash mismatches, future dispositions, malformed UTF-8, post-cutoff case closures, temporal gap exclusion and cohort duplicates.

**Research caveat**: Re-censoring a later extract does **not** recreate the exact historical data available at the training cutoff. Revisions, deleted/delayed filings, case transfers and historical cohort membership remain sources of selection bias. Only separately archived and independently audited release snapshots can support a stronger historical-as-of claim.

**Official references**:
- https://www.fjc.gov/research/idb
- https://catalog.data.gov/dataset/federal-court-cases-integrated-database-series
- https://www.uscourts.gov/data-table-topics/civil

**Still missing:** signed/archived real source files, format/codebook confirmation, historical snapshot reconstruction, cohort representativeness assessment, temporal backtests, statistical modeling, calibrations and attorney safety review. No trained predictor or live database has been created.


## 2026-10-25 additional engineering: reviewed converted text, not a native FJC parser

- `src/intelligence/usa/fjcVerifiedDelimitedSnapshot.ts` parses only deliberately reviewed UTF-8 CSV/TSV conversions, AFTER SHA-256 verification of the **same converted bytes**. It requires an approved per-edition codebook map, format declaration, controlled size, consistent columns, nonduplicate headers and dates, and strict denial on malformed records.
- `fjcVerifiedDelimitedSnapshot.test.ts` has synthetic cases for quote escaping, LF/CRLF, source substitution, missing/mismatched columns, file version and censoring. The official IDB is **not assumed to ship as CSV**; obtaining the actual source file, independently hashing it, and validating any converter is still a separate release gate.
- `docs/usa/sql/REVIEW_ONLY_usa_legal_search_boundary.sql` was hardened: the privileged atomic quota implementation is in a non-exposed `usa_private` schema, with a `SECURITY INVOKER` public wrapper. The entire draft requires a deliberate US-only session interlock and remains outside executable migrations. Database access tests are not yet run.
- The official FJC *Integrated Database: A Research Guide* notes that presiding judge-identifying data are redacted from the IDB under Judicial Conference policy. Consequently, **the IDB cannot supply verified individual-judge identifiers for a judge-specific predictive model**. A judge-specific model would require separately lawful, permitted and independently validated sources; no judge-specific scores should be inferred from IDB rows.
- The FJC guide also specifies that a case identity is formed using circuit/district, office and docket components and that quarterly replacement can overwrite information. Our single `recordId` field therefore requires a reviewed composite-key mapping from original source data and a proven archival/snapshot protocol.

Reference: https://www.fjc.gov/sites/default/files/IDB-Research-Guide.pdf and https://www.fjc.gov/research/idb


## 2026-10-25 — descriptive, right-censored baseline (not legal AI predictor)

- `src/intelligence/usa/fjcDescriptiveSurvival.ts` implements **Kaplan–Meier** nontermination survival steps with same-day event/censor handling and restricted mean follow-up days up to an explicit horizon. It consumes ONLY the already audited time-split `TemporalCohortRow` contract; it does not train personalized legal outcome probabilities.
- `src/intelligence/usa/fjcDescriptiveSurvival.test.ts` uses wholly synthetic duration rows to check risk sets, censoring, tie handling, area under the curve, unknown median, duplicate/invalid case denial, and conservative abstention.
- The estimator returns null for fewer than 30 rows, fewer than 10 observed terminations **within the requested horizon**, fewer than 5 with follow-up reaching that horizon, or when the chosen horizon exceeds all follow-up. Such minimums are engineering safety guards, **not** a guarantee of statistical power.
- All outputs explicitly set `predictiveModelValidated=false`, `dataProvenanceAudited=false`, and `assumptionsVerified=false`. The method assumes independent censoring, which is unverified for FJC IDB and may fail because court-specific administrative data coverage is not random.
- A descriptive KM curve is not prospective prediction. Even on real data it needs audited sampling, interval estimates, subgroup analyses, temporal validation, risks of court heterogeneity, rights/terms review and professional legal review before any user-facing display.
- In particular: termination means the case ended, not who prevailed; a judge-level win rate cannot be inferred from FJC IDB.

NO live source was queried or downloaded; all estimator tests are synthetic.


## 2026-10-25 — public-opinion citation dossier, research discovery only

- `src/intelligence/usa/caseLawCitationDossier.ts`: prepares deduplicated case-law research citation cards from the existing US CourtListener metadata normalizer; preserves source IDs, court, reported citation and safe official opinion links only. Invalid/malformed cases fail closed, URLs that do not match the trusted CourtListener origin/path are suppressed.
- `src/intelligence/usa/caseLawCitationDossier.test.ts`: synthetic cases for spoofed URLs, malicious labels, duplicate opinion clusters, invalid decision dates and fabricated outcome flags.
- Every card marks `hasVerifiedOpinionText=false`, `subsequentTreatmentChecked=false`, `bindingAuthorityDetermined=false`, and `legalOutcomeVerified=false`. CourtListener search results are **not a citator** or proof that an opinion is good law. Lawyers must inspect full decisions and citation treatment using lawful/licensed sources before any case-specific assertion.
- Does not add public predictive probabilities, court hierarchy inference, judge rankings or real provider requests. Data source commercial-use approval is still pending.


## 2026-10-26 — digest-bound FJC research lineage, synthetic validation

- `src/intelligence/usa/fjcByteBoundResearch.ts` now connects exact converted FJC JSON bytes, a codebook-reviewed manifest, an **externally pinned** dataset/revision/SHA-256/as-of selection, a re-censored temporal split and a separate held-out-period descriptive duration memo in one execution path.
- The verified SHA-256 is computed over bytes **before parsing**. Substitution of a case, hash, revision, dataset identifier, snapshot date or review flag fails closed; it never borrows older/training court records into the selected validation cohort.
- `fjcByteBoundResearch.test.ts` includes 70 synthetic cases, hash substitution, pinned-manifest mismatch, a separated foreign-court cohort, overlapping filing periods and a future termination date.
- Source authenticity remains `false` because anyone can hash their own file: **an independent authenticated FJC download, independently controlled expected digest, legitimate rights and reviewed codebook are still required**. The historical split is reconstructed retrospectively and is **NOT** a genuinely archived as-of-time snapshot. No fitted model, legal outcomes or judge-level probabilities.
- Last confirmed exact-head GitHub Actions: isolated USA tests, web TypeScript/build, intelligence and NexOffice bridge passed on `10593fd`.


## 2026-10-26 — fitted categorical logistic benchmark, not an approved legal predictor

- `src/intelligence/usa/fjcFeatureLogisticResearch.ts` now implements an actual **deterministic L2-regularized logistic regression fit** over filing-time administrative `courtCode` + `natureOfSuit` categories (trained on the earlier cohort only). It compares held-out Brier error with an unconditional historical baseline. It never outputs case-specific scores or uses judge names, parties, case text or outcome/merit labels.
- Case administrative **termination within H days is not a litigant win or legal outcome**. Right-censored observations shorter than H cause abstention; minimum cohort/class/category support, unseen validation categories, duplicate IDs and temporal cutoffs are enforced. A lower *synthetic* Brier score is not evidence of real-world clinical/legal or judicial predictive value.
- `src/intelligence/usa/fjcByteBoundResearch.ts` now calls this model strictly **after SHA-256 verification of exact converted source bytes, an independently expected manifest pin, and the temporal split**. Synthetic integration tests include an adequate two-court/two-suit cohort and negative source-substitution cases.
- `fittedFeatureModel=true` means executable coefficients have actually been estimated; `individualForecastEnabled=false`, `realFJCSourceAuthenticated=false`, `genuineHistoricalSnapshotVerified=false` and `independentExternalValidationComplete=false` explicitly remain.
- Release gates: acquire official FJC data under authorized terms; establish immutable independently trusted snapshot and a reviewed codebook; cleanly separate temporal training/validation snapshots; assess right censoring/missingness, temporal drift, calibration and event definitions; independent external/human legal review; protect courts with thin samples; test bias and distribution shift. No exposure in the Brazil app, US consumer UI or production APIs.
