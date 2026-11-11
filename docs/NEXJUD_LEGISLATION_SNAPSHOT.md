# NexJud: JSON snapshot versionado da pesquisa de normas (offline)

Export: `exportLegislationDraftSnapshot(acceptedStagedDocuments)`.
Import: `importLegislationDraftSnapshot(json)` returns a local lexical index
with source URLs, versions, article numbers and hashes. It never reads/writes
a DB, Supabase, filesystem, network, private cases or production RAG.

The content is sorted deterministically by norm identity. A SHA-256 checksum
detects accidental corruption; **it is not a signature, legal proof or official
verification**, because a malicious party can recompute it. Up to 50 source
documents and 10 MB are accepted; duplicates/conflicts must be quarantined
before export. All records are rejected if any tries to declare itself an
officially verified source.

Before real usage, add official-source verification, cryptographic signing
by an authorized publisher, historical effective-date modelling, transactionally
versioned database storage and tenant-scoped search API. Do not activate the
exported content as case evidence, citations or predictive inputs by itself.
