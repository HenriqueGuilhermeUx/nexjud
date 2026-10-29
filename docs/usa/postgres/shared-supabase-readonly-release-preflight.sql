-- READ-ONLY NexJud USA shared Supabase prerequisite preflight.
-- Safe for manual inspection of metadata (SELECT ONLY): no table rows, user
-- identities, real cases, passwords, keys, or permissions are modified.
-- "SCHEMA_PRESENT_REQUIRES_SECURITY_REVIEW" is NOT approval to deploy,
-- grant pilot access, enable CourtListener, or change Brazilian production.
with required_tables as (
  select c.oid,c.relrowsecurity
  from pg_catalog.pg_class c
  where c.oid in (
    pg_catalog.to_regclass('public.usa_legal_tenants'),
    pg_catalog.to_regclass('public.usa_legal_memberships'),
    pg_catalog.to_regclass('public.usa_legal_research_entitlements'),
    pg_catalog.to_regclass('public.usa_legal_search_quotas')
  )
), table_gates as (
  select count(*)=4 and pg_catalog.bool_and(relrowsecurity) as rls,
         count(*)=4 and pg_catalog.bool_and(
           not pg_catalog.has_table_privilege('anon',oid,'SELECT')
           and not pg_catalog.has_table_privilege('anon',oid,'INSERT')
           and not pg_catalog.has_table_privilege('authenticated',oid,'INSERT')
           and not pg_catalog.has_table_privilege('authenticated',oid,'UPDATE')
           and not pg_catalog.has_table_privilege('authenticated',oid,'DELETE')
         ) as no_direct_mutation
  from required_tables
), objects as (
  select pg_catalog.to_regnamespace('usa_legal_internal') is not null
         and pg_catalog.to_regprocedure('public.usa_legal_pilot_access_ready()') is not null
         and pg_catalog.to_regprocedure('public.usa_legal_search_consume_quota(uuid)') is not null
         and pg_catalog.to_regprocedure('usa_legal_internal.provision_disabled_tenant(uuid,uuid,text)') is not null
         and pg_catalog.to_regprocedure('usa_legal_internal.record_security_pilot_review(uuid,text)') is not null
         and pg_catalog.to_regprocedure('usa_legal_internal.record_release_pilot_review(uuid,text)') is not null
         and pg_catalog.to_regprocedure('usa_legal_internal.activate_pilot_only(uuid)') is not null
         and pg_catalog.to_regprocedure('usa_legal_internal.suspend_pilot_only(uuid,text)') is not null
         and pg_catalog.to_regclass('usa_legal_internal.pilot_suspension_events') is not null
         and pg_catalog.to_regclass('usa_legal_internal.provisioning_events') is not null
         and pg_catalog.to_regclass('usa_legal_internal.pilot_review_events') is not null
         and pg_catalog.to_regclass('usa_legal_internal.pilot_activation_events') is not null
         as all_present
), execute_gates as (
  select not exists (
    select 1 from pg_catalog.pg_proc p
    where p.oid in (
      pg_catalog.to_regprocedure('usa_legal_internal.provision_disabled_tenant(uuid,uuid,text)'),
      pg_catalog.to_regprocedure('usa_legal_internal.record_security_pilot_review(uuid,text)'),
      pg_catalog.to_regprocedure('usa_legal_internal.record_release_pilot_review(uuid,text)'),
      pg_catalog.to_regprocedure('usa_legal_internal.activate_pilot_only(uuid)'),
      pg_catalog.to_regprocedure('usa_legal_internal.suspend_pilot_only(uuid,text)')
    )
    and (pg_catalog.has_function_privilege('anon',p.oid,'EXECUTE')
         or pg_catalog.has_function_privilege('authenticated',p.oid,'EXECUTE'))
  ) as private_admin_not_public
)
select case
 when coalesce((select rls from table_gates),false)
   and coalesce((select no_direct_mutation from table_gates),false)
   and (select all_present from objects)
   and (select private_admin_not_public from execute_gates)
 then 'SCHEMA_PRESENT_REQUIRES_SECURITY_REVIEW'
 else 'NOT_INSTALLED_OR_INCOMPLETE'
 end as usa_pilot_schema_readiness;
