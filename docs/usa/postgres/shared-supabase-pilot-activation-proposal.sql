-- NexJud USA pilot approval + activation contract.
-- DISPOSABLE POSTGRESQL 17 TEST ONLY. NEVER RUN ON PRODUCTION.
-- Prerequisites: shared-supabase-usa-proposal.sql and
-- shared-supabase-provisioning-proposal.sql.
-- Roles are NOLOGIN and have no direct DML or grants on Brazilian assets.
-- Evidence hashes are not cryptographic signatures or real human verification.
-- Operational activation MUST have separately validated reviewer credentials.
create role usa_legal_security_reviewer nologin;
create role usa_legal_release_reviewer nologin;
create role usa_legal_pilot_activator nologin;

grant usage on schema usa_legal_internal to
  usa_legal_security_reviewer, usa_legal_release_reviewer,
  usa_legal_pilot_activator;

-- Two distinct review checkpoints, immutable by ordinary SQL UPDATE/DELETE.
-- Database owners/superusers remain capable of tampering, so an externally
-- archived checkpoint would be needed for independently verifiable custody.
create table usa_legal_internal.pilot_review_events (
  tenant_id uuid not null references public.usa_legal_tenants(id),
  gate text not null check (gate in ('security','release')),
  evidence_sha256 text not null check (evidence_sha256 ~ '^[0-9a-f]{64}$'),
  recorded_at timestamptz not null default transaction_timestamp(),
  primary key (tenant_id,gate)
);
create table usa_legal_internal.pilot_activation_events (
  tenant_id uuid primary key references public.usa_legal_tenants(id),
  security_evidence_sha256 text not null
    check (security_evidence_sha256 ~ '^[0-9a-f]{64}$'),
  release_evidence_sha256 text not null
    check (release_evidence_sha256 ~ '^[0-9a-f]{64}$'),
  activated_at timestamptz not null default transaction_timestamp()
);
revoke all on usa_legal_internal.pilot_review_events,
  usa_legal_internal.pilot_activation_events
  from public, anon, authenticated, usa_legal_provisioner,
  usa_legal_security_reviewer, usa_legal_release_reviewer,
  usa_legal_pilot_activator;
alter table usa_legal_internal.pilot_review_events enable row level security;
alter table usa_legal_internal.pilot_activation_events enable row level security;

-- Use the same already vetted private immutable-event trigger for both.
create trigger usa_pilot_review_event_guard
  before update or delete on usa_legal_internal.pilot_review_events
  for each row execute function usa_legal_internal.reject_provisioning_event_change();
create trigger usa_pilot_activation_event_guard
  before update or delete on usa_legal_internal.pilot_activation_events
  for each row execute function usa_legal_internal.reject_provisioning_event_change();

-- Only a role authorized for the EXACT review gate may append its checkpoint.
-- No generic gate parameter is supplied to callers.
create or replace function usa_legal_internal.record_security_pilot_review(
  p_tenant_id uuid, p_evidence_sha256 text
) returns boolean language plpgsql security definer set search_path='' as $usa$
declare
  v_onboarding_evidence text;
begin
  if p_tenant_id is null or p_evidence_sha256 is null or
    p_evidence_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'usa_pilot_invalid_review';
  end if;
  select p.approval_evidence_sha256 into v_onboarding_evidence
  from usa_legal_internal.provisioning_events p
  join public.usa_legal_tenants t on t.id=p.tenant_id
  join public.usa_legal_memberships m on m.tenant_id=t.id
    and m.user_id=p.owner_user_id and m.role='owner'
  where p.tenant_id=p_tenant_id and t.status='disabled' and m.status='pending'
  for update of t;
  if not found or v_onboarding_evidence=p_evidence_sha256 then
    raise exception 'usa_pilot_not_reviewable';
  end if;
  insert into usa_legal_internal.pilot_review_events
    (tenant_id,gate,evidence_sha256)
  values(p_tenant_id,'security',p_evidence_sha256);
  return true;
end
$usa$;

create or replace function usa_legal_internal.record_release_pilot_review(
  p_tenant_id uuid, p_evidence_sha256 text
) returns boolean language plpgsql security definer set search_path='' as $usa$
declare
  v_onboarding_evidence text;
  v_security_evidence text;
begin
  if p_tenant_id is null or p_evidence_sha256 is null or
    p_evidence_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'usa_pilot_invalid_review';
  end if;
  select p.approval_evidence_sha256 into v_onboarding_evidence
  from usa_legal_internal.provisioning_events p
  join public.usa_legal_tenants t on t.id=p.tenant_id
  join public.usa_legal_memberships m on m.tenant_id=t.id
    and m.user_id=p.owner_user_id and m.role='owner'
  where p.tenant_id=p_tenant_id and t.status='disabled' and m.status='pending'
  for update of t;
  if not found then raise exception 'usa_pilot_not_reviewable'; end if;
  select e.evidence_sha256 into v_security_evidence
  from usa_legal_internal.pilot_review_events e
  where e.tenant_id=p_tenant_id and e.gate='security';
  if v_security_evidence is null or p_evidence_sha256 in
     (v_onboarding_evidence,v_security_evidence) then
    raise exception 'usa_pilot_missing_independent_security_review';
  end if;
  insert into usa_legal_internal.pilot_review_events
    (tenant_id,gate,evidence_sha256)
  values(p_tenant_id,'release',p_evidence_sha256);
  return true;
end
$usa$;

-- Activates ONLY the verified pilot shell; research/billing remain DISABLED.
create or replace function usa_legal_internal.activate_pilot_only(
  p_tenant_id uuid
) returns boolean language plpgsql security definer set search_path='' as $usa$
declare
  v_owner uuid;
  v_security_evidence text;
  v_release_evidence text;
begin
  if p_tenant_id is null then raise exception 'usa_pilot_invalid_activation'; end if;
  select p.owner_user_id into v_owner
  from usa_legal_internal.provisioning_events p
  join public.usa_legal_tenants t on t.id=p.tenant_id
  where p.tenant_id=p_tenant_id and t.status='disabled'
  for update of t;
  if not found or v_owner is null then
    raise exception 'usa_pilot_not_eligible';
  end if;

  select e.evidence_sha256 into v_security_evidence
    from usa_legal_internal.pilot_review_events e
    where e.tenant_id=p_tenant_id and e.gate='security';
  select e.evidence_sha256 into v_release_evidence
    from usa_legal_internal.pilot_review_events e
    where e.tenant_id=p_tenant_id and e.gate='release';
  if v_security_evidence is null or v_release_evidence is null or
     v_security_evidence=v_release_evidence then
    raise exception 'usa_pilot_missing_dual_review';
  end if;

  -- Guard both role state and forbidden research activation.
  if not exists (
    select 1 from public.usa_legal_memberships m
    where m.tenant_id=p_tenant_id and m.user_id=v_owner
      and m.role='owner' and m.status='pending'
  ) or not exists (
    select 1 from public.usa_legal_research_entitlements e
    where e.tenant_id=p_tenant_id and e.enabled=false
  ) or not exists (
    select 1 from public.usa_legal_search_quotas q
    where q.tenant_id=p_tenant_id and q.remaining=0
  ) then raise exception 'usa_pilot_not_eligible'; end if;

  update public.usa_legal_tenants set status='active'
    where id=p_tenant_id and status='disabled';
  update public.usa_legal_memberships set status='active'
    where tenant_id=p_tenant_id and user_id=v_owner and status='pending';
  insert into usa_legal_internal.pilot_activation_events
    (tenant_id,security_evidence_sha256,release_evidence_sha256)
  values(p_tenant_id,v_security_evidence,v_release_evidence);
  return true;
end
$usa$;

-- PostgreSQL functions default to PUBLIC EXECUTE. Refuse all other roles.
revoke all on function
  usa_legal_internal.record_security_pilot_review(uuid,text),
  usa_legal_internal.record_release_pilot_review(uuid,text),
  usa_legal_internal.activate_pilot_only(uuid)
  from public, anon, authenticated,
    usa_legal_provisioner, usa_legal_security_reviewer,
    usa_legal_release_reviewer, usa_legal_pilot_activator;
grant execute on function usa_legal_internal.record_security_pilot_review(uuid,text)
  to usa_legal_security_reviewer;
grant execute on function usa_legal_internal.record_release_pilot_review(uuid,text)
  to usa_legal_release_reviewer;
grant execute on function usa_legal_internal.activate_pilot_only(uuid)
  to usa_legal_pilot_activator;

comment on function usa_legal_internal.activate_pilot_only(uuid)
is 'OFFLINE-PROPOSAL ONLY: three-role pilot-shell activation after distinct evidence hashes; no legal search entitlement, quota or payment activation.';
