-- PROPOSAL ONLY. NexJud USA FJC isolated research audit registry.
-- DO NOT APPLY to Supabase/production. Tested solely in disposable PostgreSQL CI.
-- No client grants. Admin-only functions. Trust in identity, signer onboarding,
-- verified ECDSA, official FJC provenance and offsite checkpoints is EXTERNAL.
create schema if not exists usa_fjc_audit_lab;
revoke all on schema usa_fjc_audit_lab from public;

create table usa_fjc_audit_lab.ledger_head (
  singleton boolean primary key default true check (singleton),
  sequence bigint not null check (sequence >= 0),
  head_digest text not null check (head_digest ~ '^[0-9a-f]{64}$')
);
insert into usa_fjc_audit_lab.ledger_head (singleton,sequence,head_digest)
values (true,0,repeat('0',64));

create table usa_fjc_audit_lab.ledger_events (
  sequence bigint primary key check (sequence > 0),
  previous_digest text not null check (previous_digest ~ '^[0-9a-f]{64}$'),
  event_digest text not null unique check (event_digest ~ '^[0-9a-f]{64}$'),
  event_kind text not null check (event_kind in ('register_key','revoke_key','commit_review')),
  payload jsonb not null check (jsonb_typeof(payload)='object'),
  recorded_at timestamptz not null
);
create index ledger_events_kind_idx on usa_fjc_audit_lab.ledger_events(event_kind);
create index ledger_events_key_lookup_idx
  on usa_fjc_audit_lab.ledger_events ((payload->>'key_id'))
  where event_kind in ('register_key','revoke_key');
create unique index ledger_events_release_once_idx
  on usa_fjc_audit_lab.ledger_events
  ((payload->>'dataset_id'),(payload->>'revision'))
  where event_kind='commit_review';

-- No client roles may read, append or edit these lab tables.
revoke all on usa_fjc_audit_lab.ledger_head from public;
revoke all on usa_fjc_audit_lab.ledger_events from public;
alter table usa_fjc_audit_lab.ledger_head enable row level security;
alter table usa_fjc_audit_lab.ledger_events enable row level security;

-- Owner/superuser recovery or DB administrator access is not prevented by
-- this defense; durable integrity requires independent exported checkpoints.
create or replace function usa_fjc_audit_lab.reject_mutable_event()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'fjc_audit_events_are_append_only';
end
$$;
create trigger fjc_immutable_events
  before update or delete on usa_fjc_audit_lab.ledger_events
  for each row execute function usa_fjc_audit_lab.reject_mutable_event();

-- Serializes CAS append on singleton head; never expose to anon, authenticated
-- or service_role until a trusted server-side verifier/authorization exists.
create or replace function usa_fjc_audit_lab.append_event(
  p_kind text, p_payload jsonb,
  p_expected_sequence bigint, p_expected_previous_digest text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_sequence bigint;
  v_head text;
  v_now timestamptz := transaction_timestamp();
  v_digest text;
  v_count integer;
  v_kind text;
  v_role text;
  v_key text;
  v_start timestamptz;
  v_end timestamptz;
  v_id text;
  v_review_keys text[];
  v_review_roles text[] := array['source','mapping','rights'];
  v_reviewer_ids text[];
  v_pins text[];
  v_i integer;
  v_n integer;
begin
  if p_kind not in ('register_key','revoke_key','commit_review')
     or jsonb_typeof(p_payload) <> 'object'
     or p_expected_sequence is null or p_expected_sequence < 1
     or p_expected_previous_digest !~ '^[0-9a-f]{64}$' then
    raise exception 'fjc_audit_invalid_event_request';
  end if;
  select sequence,head_digest into strict v_sequence,v_head
  from usa_fjc_audit_lab.ledger_head where singleton=true for update;
  if p_expected_sequence <> v_sequence + 1 or p_expected_previous_digest <> v_head then
    raise exception 'fjc_audit_stale_checkpoint';
  end if;

  select count(*) into v_count from pg_catalog.jsonb_object_keys(p_payload);
  if p_kind='register_key' then
    if v_count<>7 or not (p_payload ?& array[
      'role','reviewer_id','key_id','pinned_spki_sha256',
      'activated_at','expires_at','review_evidence_sha256'
    ]) or
      (p_payload->>'role') not in ('source','mapping','rights') or
      (p_payload->>'reviewer_id') !~ '^[A-Za-z0-9_.:-]{3,120}$' or
      (p_payload->>'key_id') !~ '^[A-Za-z0-9_.:-]{3,120}$' or
      (p_payload->>'pinned_spki_sha256') !~ '^[0-9a-f]{64}$' or
      (p_payload->>'review_evidence_sha256') !~ '^[0-9a-f]{64}$' or
      (p_payload->>'activated_at') !~ '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$' or
      (p_payload->>'expires_at') !~ '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z$'
    then raise exception 'fjc_audit_invalid_key_registration'; end if;
    v_start := (p_payload->>'activated_at')::timestamptz;
    v_end := (p_payload->>'expires_at')::timestamptz;
    if v_start >= v_end or v_end<=v_now then
      raise exception 'fjc_audit_invalid_key_window';
    end if;
    -- Never permit reuse of a key ID or SPKI fingerprint, even post revocation.
    if exists (select 1 from usa_fjc_audit_lab.ledger_events e
        where e.event_kind='register_key' and (
          e.payload->>'key_id' = p_payload->>'key_id'
          or e.payload->>'pinned_spki_sha256'=p_payload->>'pinned_spki_sha256'
        )) then raise exception 'fjc_audit_key_reuse'; end if;
  elsif p_kind='revoke_key' then
    if v_count<>2 or not (p_payload ?& array['key_id','reason']) or
       (p_payload->>'key_id') !~ '^[A-Za-z0-9_.:-]{3,120}$' or
       length(coalesce(p_payload->>'reason','')) not between 8 and 256
    then raise exception 'fjc_audit_invalid_key_revocation'; end if;
    if not exists (select 1 from usa_fjc_audit_lab.ledger_events e
        where e.event_kind='register_key'
          and e.payload->>'key_id'=p_payload->>'key_id')
       or exists (select 1 from usa_fjc_audit_lab.ledger_events e
        where e.event_kind='revoke_key'
          and e.payload->>'key_id'=p_payload->>'key_id')
    then raise exception 'fjc_audit_missing_or_revoked_key'; end if;
  else
    -- The trusted caller MUST cryptographically verify signatures BEFORE
    -- committing. PostgreSQL only binds supplied proof digest and key epochs.
    if v_count<>11 or not (p_payload ?& array[
      'dataset_id','revision','source_sha256','converted_sha256',
      'signed_review_digest','review_sequence','review_previous_digest',
      'source_key_id','mapping_key_id','rights_key_id','proof_version'
    ]) or (p_payload->>'dataset_id') !~ '^[A-Za-z0-9_.:-]{3,120}$'
       or (p_payload->>'revision') !~ '^[A-Za-z0-9_.:-]{3,120}$'
       or (p_payload->>'source_sha256') !~ '^[0-9a-f]{64}$'
       or (p_payload->>'converted_sha256') !~ '^[0-9a-f]{64}$'
       or (p_payload->>'signed_review_digest') !~ '^[0-9a-f]{64}$'
       or jsonb_typeof(p_payload->'review_sequence') <> 'number'
       or (p_payload->>'review_sequence') !~ '^[0-9]+$'
       or (p_payload->>'review_sequence')::bigint <> p_expected_sequence
       or (p_payload->>'review_previous_digest') <> v_head
       or (p_payload->>'proof_version') <> 'NEXJUD_USA_FJC_SIGNED_REVIEW_V1'
       or (p_payload->>'source_key_id') !~ '^[A-Za-z0-9_.:-]{3,120}$'
       or (p_payload->>'mapping_key_id') !~ '^[A-Za-z0-9_.:-]{3,120}$'
       or (p_payload->>'rights_key_id') !~ '^[A-Za-z0-9_.:-]{3,120}$'
    then raise exception 'fjc_audit_invalid_review_record'; end if;
    v_review_keys:=array[p_payload->>'source_key_id',
      p_payload->>'mapping_key_id',p_payload->>'rights_key_id'];
    if v_review_keys[1]=v_review_keys[2] or
       v_review_keys[1]=v_review_keys[3] or v_review_keys[2]=v_review_keys[3]
    then raise exception 'fjc_audit_duplicate_role_key'; end if;
    v_reviewer_ids:=array[]::text[];
    v_pins:=array[]::text[];
    for v_i in 1..3 loop
      select e.payload->>'reviewer_id',e.payload->>'pinned_spki_sha256',
             (e.payload->>'activated_at')::timestamptz,
             (e.payload->>'expires_at')::timestamptz
      into v_id,v_key,v_start,v_end
      from usa_fjc_audit_lab.ledger_events e
      where e.event_kind='register_key'
        and e.payload->>'key_id'=v_review_keys[v_i]
        and e.payload->>'role'=v_review_roles[v_i];
      if not found or v_start>v_now or v_end<=v_now or
         exists (select 1 from usa_fjc_audit_lab.ledger_events x
           where x.event_kind='revoke_key'
             and x.payload->>'key_id'=v_review_keys[v_i]) then
        raise exception 'fjc_audit_missing_inactive_or_revoked_reviewer_key';
      end if;
      v_reviewer_ids:=array_append(v_reviewer_ids,v_id);
      v_pins:=array_append(v_pins,v_key);
    end loop;
    if v_reviewer_ids[1]=v_reviewer_ids[2] or
       v_reviewer_ids[1]=v_reviewer_ids[3] or
       v_reviewer_ids[2]=v_reviewer_ids[3] or
       v_pins[1]=v_pins[2] or v_pins[1]=v_pins[3] or v_pins[2]=v_pins[3]
    then raise exception 'fjc_audit_nonindependent_reviewer_keys'; end if;
    if exists(select 1 from usa_fjc_audit_lab.ledger_events e
       where e.event_kind='commit_review' and
         e.payload->>'dataset_id'=p_payload->>'dataset_id' and
         e.payload->>'revision'=p_payload->>'revision')
    then raise exception 'fjc_audit_duplicate_dataset_revision'; end if;
  end if;

  v_digest:=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
    'NEXJUD_USA_FJC_AUDIT_LEDGER_V1|' ||
    p_expected_sequence::text || '|' || v_head || '|' ||
    p_kind || '|' || v_now::text || '|' || p_payload::text,
    'UTF8')), 'hex');
  insert into usa_fjc_audit_lab.ledger_events(
    sequence,previous_digest,event_digest,event_kind,payload,recorded_at
  ) values(p_expected_sequence,v_head,v_digest,p_kind,p_payload,v_now);
  update usa_fjc_audit_lab.ledger_head
    set sequence=p_expected_sequence,head_digest=v_digest
    where singleton=true;
  return pg_catalog.jsonb_build_object('sequence',p_expected_sequence,'event_digest',v_digest);
end
$$;

revoke all on function usa_fjc_audit_lab.reject_mutable_event() from public;
revoke all on function usa_fjc_audit_lab.append_event(text,jsonb,bigint,text) from public;
comment on schema usa_fjc_audit_lab is
  'DISPOSABLE NexJud USA research-only proposal, not production migration';
comment on function usa_fjc_audit_lab.append_event(text,jsonb,bigint,text) is
  'Admin-only CAS event append. Signatures/rights not validated by SQL; DO NOT GRANT to API roles.';
