# NexJud USA — isolated FJC audit registry proof of concept

**Status: research-only, disposable PostgreSQL CI. NOT a production migration.**
This directory is deliberately **outside** `supabase/migrations`, so a normal
database migration runner must never apply it automatically.

## What is verified

The proposal schema `usa_fjc_audit_lab` creates an admin-owned singleton head
(`sequence`, SHA-256 `head_digest`) and an append-only `ledger_events` table.
An admin-only database function locks the head row with `FOR UPDATE`,
compares the externally supplied expected sequence and digest, checks key-role
state, then inserts one event and advances the head in the **same transaction**.

Supported event types:

- `register_key`: pins an externally reviewed reviewer key fingerprint,
  declared reviewer ID, role, key-active window, and evidence digest. Reuse
  of an old key ID or SPKI fingerprint is refused, including after revocation.
- `revoke_key`: appends a revocation event for an existing key. Original
  registrations are never rewritten.
- `commit_review`: records a versioned release review fingerprint and
  source/converted file digests, tied to the **current** ledger checkpoint.
  Requires three active, unrevoked, distinct reviewer keys in the correct
  roles and disallows duplicate (dataset, revision) pairs.

A trigger rejects UPDATE/DELETE of event history. Public schema/table/function
privileges are revoked; tables also have RLS enabled and no client policies.
A DB administrator or superuser can still modify the system, including the
head or the trigger, so this is **not cryptographically immutable storage**.
An independent archival checkpoint and separation of DB administration are
required for tamper-evident operational use.

## How to run (only in a disposable PostgreSQL 17 database)

```bash
psql -X -v ON_ERROR_STOP=1 -f docs/usa/postgres/fjc-audit-disposable-proposal.sql
psql -X -v ON_ERROR_STOP=1 -f docs/usa/postgres/fjc-audit-disposable-contract-tests.sql
```

The GitHub workflow `.github/workflows/usa-fjc-audit-disposable-postgres.yml`
creates an ephemeral PostgreSQL service, applies these files, and races two
identical writers against a single CAS checkpoint. Precisely one must
succeed; the other must be rejected.

No real FJC, PACER, RECAP, Brazilian NexJud, user, clinical, or client data
is accessed.

## Integration boundary — NOT connected to an app or production

1. A backend-controlled reviewer-key registry must establish human/legal
   identities, roles, public-key onboarding, revocation policy and key rotation.
   The SQL schema merely stores declared hash IDs from privileged commands.
2. A trusted service must load the **actual public key bytes**, pin their
   SHA-256s from that separately authorized registry, and run
   `verifyUSFJCPinnedSignedReview` before `commit_review`.
   SQL **cannot** infer a genuine ECDSA validation from a supplied
   `signed_review_digest`. No client or browser may call `append_event`.
3. At commit, the trusted service needs an atomic expected checkpoint and
   reviewer key snapshot; if that head changes between cryptographic
   verification and DB append, it must **fail and request fresh signatures**.
   It must never silently adjust `review_sequence` or
   `review_previous_digest` in a signed payload.
4. `commit_review` stores the verified digest as *evidence* and checks that
   signed sequence and previous hash match the DB head. The SQL ledger digest
   uses a separate `NEXJUD_USA_FJC_AUDIT_LEDGER_V1` domain. The TypeScript
   signature fingerprint uses `NEXJUD_USA_FJC_REVIEW_LINK_V1`.
   These are intentionally **different**. The backend must preserve both,
   rather than substituting one for the other.
5. The database prototype does not verify upstream official FJC release
   origin, signed codebook, conversion runtime attestation, research-use
   license, external calibration, legal case outcomes or identity provider
   audit. The earlier reports keep all associated certification flags false.

## Release gates still missing

A real service, authorized database role and key lifecycle, independent
append-only checkpoint archive, trusted clock, rights review, legal counsel
and separate regulated-data assessment must all be designed and approved
before this could become a production component.

**Prohibited here:** actual migrations against production, branch merge,
deployment, live key generation, money movement, official FJC data ingestion,
and any individual legal win/loss predictions.
