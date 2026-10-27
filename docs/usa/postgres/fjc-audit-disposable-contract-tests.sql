-- Run ONLY after fjc-audit-disposable-proposal.sql in isolated PG17.
-- Synthetic review registry, no customer records or official FJC datasets.
\set ON_ERROR_STOP on
set timezone='UTC';

do $tests$
declare
  seq bigint := 1;
  prev text := repeat('0',64);
  out jsonb;
  review jsonb;
  evt jsonb;
  role_names text[] := array['source','mapping','rights'];
  i integer;
  raised boolean;
  live_start text := to_char(transaction_timestamp()-interval '1 day','YYYY-MM-DD"T"HH24:MI:SS"Z"');
  live_end text := to_char(transaction_timestamp()+interval '30 days','YYYY-MM-DD"T"HH24:MI:SS"Z"');
begin
  -- Server registers 3 DISTINCT reviewed public-key fingerprints and identifiers.
  for i in 1..3 loop
    evt:=jsonb_build_object(
      'role',role_names[i],'reviewer_id','synthetic-reviewer-'||i::text,
      'key_id','synthetic-key-'||i::text,
      'pinned_spki_sha256',repeat(i::text,64),
      'review_evidence_sha256',repeat((i+3)::text,64),
      'activated_at',live_start,'expires_at',live_end
    );
    out:=usa_fjc_audit_lab.append_event('register_key',evt,seq,prev);
    if (out->>'sequence')::bigint <> seq or length(out->>'event_digest')<>64 then
      raise exception 'registered key event missing';
    end if;
    prev:=out->>'event_digest';
    seq:=seq+1;
  end loop;

  -- Duplicate key ID cannot be re-registered under a new role/identity.
  raised:=false;
  begin
    perform usa_fjc_audit_lab.append_event('register_key',jsonb_build_object(
      'role','source','reviewer_id','another-reviewer',
      'key_id','synthetic-key-1',
      'pinned_spki_sha256',repeat('a',64),
      'review_evidence_sha256',repeat('b',64),
      'activated_at',live_start,'expires_at',live_end
    ),seq,prev);
  exception when others then
    if sqlerrm <> 'fjc_audit_key_reuse' then raise; end if;
    raised:=true;
  end;
  if not raised then raise exception 'duplicate key ID allowed'; end if;

  -- Exactly one successful append for a given previous checkpoint and seq.
  review:=jsonb_build_object(
    'dataset_id','synthetic-idb','revision','review-v1',
    'source_sha256',repeat('a',64),
    'converted_sha256',repeat('b',64),
    'signed_review_digest',repeat('c',64),
    'review_sequence',seq,'review_previous_digest',prev,
    'source_key_id','synthetic-key-1','mapping_key_id','synthetic-key-2',
    'rights_key_id','synthetic-key-3',
    'proof_version','NEXJUD_USA_FJC_SIGNED_REVIEW_V1'
  );
  out:=usa_fjc_audit_lab.append_event('commit_review',review,seq,prev);
  if (out->>'sequence')::bigint <> seq then raise exception 'review append failed'; end if;

  raised:=false;
  begin
    perform usa_fjc_audit_lab.append_event('commit_review',review,seq,prev);
  exception when others then
    if sqlerrm <> 'fjc_audit_stale_checkpoint' then raise; end if;
    raised:=true;
  end;
  if not raised then raise exception 'stale checkpoint accepted'; end if;
  prev:=out->>'event_digest';seq:=seq+1;

  raised:=false;
  begin
    perform usa_fjc_audit_lab.append_event('commit_review',
      jsonb_set(jsonb_set(review,'{review_sequence}',to_jsonb(seq)),
        '{review_previous_digest}',to_jsonb(prev)),seq,prev);
  exception when others then
    if sqlerrm <> 'fjc_audit_duplicate_dataset_revision' then raise; end if;
    raised:=true;
  end;
  if not raised then raise exception 'duplicate revision accepted'; end if;

  -- Authorization checking: no public grants, no anon or authenticated schema access.
  if exists (
    select 1 from pg_catalog.pg_namespace n,
      lateral pg_catalog.aclexplode(coalesce(
        n.nspacl, pg_catalog.acldefault('n',n.nspowner))) a
    where n.nspname='usa_fjc_audit_lab' and a.grantee=0
      and a.privilege_type='USAGE'
  ) then raise exception 'PUBLIC schema access'; end if;
  if exists (
    select 1 from pg_catalog.pg_proc p
      join pg_catalog.pg_namespace n on n.oid=p.pronamespace,
      lateral pg_catalog.aclexplode(coalesce(
        p.proacl,pg_catalog.acldefault('f',p.proowner))) a
    where n.nspname='usa_fjc_audit_lab' and p.proname='append_event'
      and a.grantee=0 and a.privilege_type='EXECUTE'
  ) then raise exception 'PUBLIC append access'; end if;

  -- SQL itself does not verify ECDSA! Reject fake claims in structure only.
  raised:=false;
  begin
    perform usa_fjc_audit_lab.append_event('commit_review',
      jsonb_set(jsonb_set(jsonb_set(review,'{revision}',to_jsonb('review-v2'::text)),
        '{review_sequence}',to_jsonb(seq)),
        '{review_previous_digest}',to_jsonb(prev)) ||
        '{"legal_signature_certified":true}'::jsonb,
      seq,prev);
  exception when others then
    if sqlerrm <> 'fjc_audit_invalid_review_record' then raise; end if;
    raised:=true;
  end;
  if not raised then raise exception 'extraneous unsigned JSON allowed'; end if;

  -- Append-only row history, even if an owner tries ordinary UPDATE or DELETE.
  raised:=false;
  begin
    update usa_fjc_audit_lab.ledger_events set payload='{}'::jsonb where sequence=1;
  exception when others then
    if sqlerrm <> 'fjc_audit_events_are_append_only' then raise; end if;
    raised:=true;
  end;
  if not raised then raise exception 'history UPDATE permitted'; end if;

  raised:=false;
  begin
    delete from usa_fjc_audit_lab.ledger_events where sequence=1;
  exception when others then
    if sqlerrm <> 'fjc_audit_events_are_append_only' then raise; end if;
    raised:=true;
  end;
  if not raised then raise exception 'history DELETE permitted'; end if;

  -- Revocation is a NEW event and cannot be silently overwritten.
  out:=usa_fjc_audit_lab.append_event('revoke_key',
    jsonb_build_object('key_id','synthetic-key-2',
      'reason','synthetic operator security incident'),seq,prev);
  prev:=out->>'event_digest';seq:=seq+1;
  raised:=false;
  begin
    perform usa_fjc_audit_lab.append_event('revoke_key',
      jsonb_build_object('key_id','synthetic-key-2',
        'reason','duplicate revocation is prohibited'),seq,prev);
  exception when others then
    if sqlerrm <> 'fjc_audit_missing_or_revoked_key' then raise; end if;
    raised:=true;
  end;
  if not raised then raise exception 'duplicate revocation allowed'; end if;

  raised:=false;
  begin
    perform usa_fjc_audit_lab.append_event('commit_review',
      jsonb_set(jsonb_set(jsonb_set(review,'{revision}',to_jsonb('review-v2'::text)),
        '{review_sequence}',to_jsonb(seq)),
        '{review_previous_digest}',to_jsonb(prev)),seq,prev);
  exception when others then
    if sqlerrm <> 'fjc_audit_missing_inactive_or_revoked_reviewer_key' then raise; end if;
    raised:=true;
  end;
  if not raised then raise exception 'revoked key still used in review'; end if;

  if (select count(*) from usa_fjc_audit_lab.ledger_events) <> 5 then
    raise exception 'unexpected ledger event count';
  end if;
  if (select sequence from usa_fjc_audit_lab.ledger_head where singleton)=5 then
    raise notice 'PASS: append-only FJC synthetic audit ledger 5 events';
  else raise exception 'head/ledger mismatch'; end if;
end
$tests$;

select sequence,event_kind,substr(event_digest,1,12) as digest_prefix
from usa_fjc_audit_lab.ledger_events order by sequence;

-- A second transaction verifies that rows really persist until lab DB teardown.
do $check$
begin
  if (select count(*) from usa_fjc_audit_lab.ledger_events) <> 5 or
     (select sequence from usa_fjc_audit_lab.ledger_head where singleton)<>5
  then raise exception 'FJC registry persistent read mismatch'; end if;
end
$check$;
