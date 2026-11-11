-- NexJud USA: emergency tenant suspension / pilot access kill switch.
-- DISPOSABLE PostgreSQL 17 proof only. Do not apply to live NexJud Brazil.
-- Requires shared-supabase-usa-proposal, provisioning and pilot activation
-- proposals. Suspends only a US tenant; never queries or updates Brazil assets.
-- No externally authenticated human reviewer or independent audit custody yet.

create role usa_legal_pilot_suspender nologin;
grant usage on schema usa_legal_internal to usa_legal_pilot_suspender;

create table usa_legal_internal.pilot_suspension_events (
  tenant_id uuid primary key references public.usa_legal_tenants(id),
  reason_evidence_sha256 text not null
    check (reason_evidence_sha256 ~ '^[0-9a-f]{64}$'),
  prior_research_enabled boolean not null,
  prior_search_quota integer not null check (prior_search_quota >= 0),
  suspended_at timestamptz not null default transaction_timestamp()
);
revoke all on usa_legal_internal.pilot_suspension_events
  from public, anon, authenticated, usa_legal_provisioner,
    usa_legal_security_reviewer, usa_legal_release_reviewer,
    usa_legal_pilot_activator, usa_legal_pilot_suspender;
alter table usa_legal_internal.pilot_suspension_events enable row level security;

create trigger usa_pilot_suspension_event_guard
  before update or delete on usa_legal_internal.pilot_suspension_events
  for each row execute function
    usa_legal_internal.reject_provisioning_event_change();

-- A dedicated administrative role can suspend an already ACTIVE pilot.
-- Row lock makes duplicate suspensions reject deterministically.
-- The operation is intentionally one-way: a suspended tenant cannot be
-- reactivated by the initial onboarding workflow; require a new review.
create or replace function usa_legal_internal.suspend_pilot_only(
  p_tenant_id uuid, p_reason_evidence_sha256 text
) returns boolean language plpgsql security definer
set search_path = '' as $usa$
declare
  v_research_enabled boolean;
  v_quota integer;
  v_existing_security_digest text;
  v_existing_release_digest text;
begin
  if p_tenant_id is null or p_reason_evidence_sha256 is null
     or p_reason_evidence_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'usa_pilot_invalid_suspension';
  end if;

  -- No arbitrary tenants: only a previously reviewed and activated US pilot.
  perform 1 from public.usa_legal_tenants t
    join usa_legal_internal.pilot_activation_events a on a.tenant_id=t.id
    where t.id=p_tenant_id and t.status='active'
    for update of t;
  if not found then raise exception 'usa_pilot_not_suspensible'; end if;

  select a.security_evidence_sha256, a.release_evidence_sha256
    into v_existing_security_digest, v_existing_release_digest
    from usa_legal_internal.pilot_activation_events a
    where a.tenant_id=p_tenant_id;
  if p_reason_evidence_sha256 in
    (v_existing_security_digest,v_existing_release_digest) then
    raise exception 'usa_pilot_invalid_suspension';
  end if;

  select e.enabled into v_research_enabled
    from public.usa_legal_research_entitlements e
    where e.tenant_id=p_tenant_id for update;
  if not found then raise exception 'usa_pilot_incomplete_suspension_state'; end if;
  select q.remaining into v_quota
    from public.usa_legal_search_quotas q
    where q.tenant_id=p_tenant_id for update;
  if not found then raise exception 'usa_pilot_incomplete_suspension_state'; end if;

  update public.usa_legal_tenants set status='disabled'
    where id=p_tenant_id and status='active';
  update public.usa_legal_memberships set status='revoked'
    where tenant_id=p_tenant_id and status='active';
  update public.usa_legal_research_entitlements
    set enabled=false,valid_until=transaction_timestamp()
    where tenant_id=p_tenant_id;
  update public.usa_legal_search_quotas set remaining=0,
    updated_at=transaction_timestamp() where tenant_id=p_tenant_id;
  insert into usa_legal_internal.pilot_suspension_events
    (tenant_id,reason_evidence_sha256,prior_research_enabled,prior_search_quota)
    values (p_tenant_id,p_reason_evidence_sha256,
            v_research_enabled,v_quota);
  return true;
end
$usa$;

-- No privilege granted to browser, ordinary US users, or earlier operators.
revoke all on function usa_legal_internal.suspend_pilot_only(uuid,text)
  from public, anon, authenticated, usa_legal_provisioner,
    usa_legal_security_reviewer, usa_legal_release_reviewer,
    usa_legal_pilot_activator, usa_legal_pilot_suspender;
grant execute on function usa_legal_internal.suspend_pilot_only(uuid,text)
  to usa_legal_pilot_suspender;

comment on function usa_legal_internal.suspend_pilot_only(uuid,text)
  is 'DISPOSABLE ONLY: one-way US pilot suspension. Does not revoke Auth JWT sessions. Live rollout requires human identity and external audit approval.';
