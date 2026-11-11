\set ON_ERROR_STOP on
-- SECOND synthetic organization, for two-operator concurrent activation race.
-- Run only after the other synthetic pilot activation contract tests.
insert into auth.users(id) values ('dddddddd-dddd-4ddd-8ddd-ddddddddddd4');

set role usa_legal_provisioner;
select usa_legal_internal.provision_disabled_tenant(
  '44444444-4444-4444-8444-444444444444',
  'dddddddd-dddd-4ddd-8ddd-ddddddddddd4',repeat('1',64));
reset role;

set role usa_legal_security_reviewer;
select usa_legal_internal.record_security_pilot_review(
  '44444444-4444-4444-8444-444444444444',repeat('2',64));
reset role;

set role usa_legal_release_reviewer;
select usa_legal_internal.record_release_pilot_review(
  '44444444-4444-4444-8444-444444444444',repeat('3',64));
reset role;

do $$
begin
 if (select status from public.usa_legal_tenants
     where id='44444444-4444-4444-8444-444444444444') <> 'disabled'
    or (select remaining from public.usa_legal_search_quotas
     where tenant_id='44444444-4444-4444-8444-444444444444') <> 0
    or (select count(*) from usa_legal_internal.pilot_review_events
     where tenant_id='44444444-4444-4444-8444-444444444444') <> 2
 then raise exception 'Synthetic activation race fixture is not ready'; end if;
end
$$;
