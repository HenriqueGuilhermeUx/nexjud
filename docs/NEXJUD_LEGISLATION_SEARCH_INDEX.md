# NexJud offline legal discovery index

The legal search prototype is **only in memory**; it accepts records from
stageLegislationSourceBatch() and article extraction, then supports accent-insensitive
lexical discovery with deterministic scoring and short source excerpts.

Every result carries the original document SHA-256, URN, source URL and version.
Every result sets verifiedAgainstOfficialSource=false and safeToCiteAsOfficial=false.
A match cannot be used as a legal citation, vigency check, legal interpretation
or predictive signal until an independently verified official source is stored.

Limits: 50 staged documents, 12,000 article entries, max query 140 chars,
max 30 returned results. Does not touch React UI, Supabase, client cases, database
indices, background work or production.

Next step (separate design review): supervised official-source verification,
version-aware persistence, article-level hashes, state law coverage,
and hybrid search scoped by jurisdiction and date.
