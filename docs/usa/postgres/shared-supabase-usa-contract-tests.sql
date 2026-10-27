\set ON_ERROR_STOP on
-- Entirely synthetic users; no real Brazilian auth records imported.
insert into auth.users(id) values
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1'),
 ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2'),
 ('cccccccc-cccc-4ccc-8ccc-ccccccccccc3');
insert into public.usa_legal_tenants(id,status) values
 ('11111111-1111-4111-8111-111111111111','active'),
 ('22222222-2222-4222-8222-222222222222','active');
insert into public.usa_legal_memberships(tenant_id,user_id,role,status) values
 ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','attorney','active'),
 ('22222222-2222-4222-8222-222222222222','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2','researcher','active');
insert into public.usa_legal_research_entitlements(tenant_id,enabled) values
 ('11111111-1111-4111-8111-111111111111',true),
 ('22222222-2222-4222-8222-222222222222',true);
insert into public.usa_legal_search_quotas(tenant_id,remaining) values
 ('11111111-1111-4111-8111-111111111111',2),
 ('22222222-2222-4222-8222-222222222222',3);

-- Explicitly check privilege grants before attempting RLS visibility tests.
do $$
begin
 if pg_catalog.has_table_privilege('authenticated','public.usa_legal_search_quotas','SELECT')
    or pg_catalog.has_table_privilege('authenticated','public.usa_legal_search_quotas','UPDATE')
    or pg_catalog.has_table_privilege('authenticated','public.usa_legal_memberships','INSERT')
    or pg_catalog.has_table_privilege('anon','public.usa_legal_memberships','SELECT')
 then raise exception 'USA table leaked direct privileges'; end if;
end
$$;

set role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',false);
do $$
declare
 denied boolean := false;
begin
 if (select count(*) from public.usa_legal_memberships) <> 1 then
  raise exception 'USA membership RLS leaks other tenant';
 end if;
 if (select count(*) from public.usa_legal_research_entitlements) <> 1 then
  raise exception 'USA entitlement RLS leaks other tenant';
 end if;
 if public.usa_legal_search_consume_quota('22222222-2222-4222-8222-222222222222') then
  raise exception 'Cross-tenant USA quota consumption allowed';
 end if;
 if not public.usa_legal_search_consume_quota('11111111-1111-4111-8111-111111111111') then
  raise exception 'Authorized USA quota rejected';
 end if;
 if not public.usa_legal_search_consume_quota('11111111-1111-4111-8111-111111111111') then
  raise exception 'Second authorized USA quota rejected';
 end if;
 if public.usa_legal_search_consume_quota('11111111-1111-4111-8111-111111111111') then
  raise exception 'Quota exceeded allowed';
 end if;
 begin
  insert into public.usa_legal_memberships(tenant_id,user_id,role,status)
  values('11111111-1111-4111-8111-111111111111',
    'cccccccc-cccc-4ccc-8ccc-ccccccccccc3','owner','active');
 exception when insufficient_privilege then denied:=true;
 end;
 if not denied then raise exception 'US membership mutation allowed'; end if;
end
$$;
reset role;

set role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',false);
do $$
begin
 if (select count(*) from public.usa_legal_memberships) <> 1 then
  raise exception 'Second user USA RLS visibility wrong';
 end if;
 if (select count(*) from public.usa_legal_research_entitlements) <> 1 then
  raise exception 'Second user USA entitlements RLS wrong';
 end if;
 if public.usa_legal_search_consume_quota('11111111-1111-4111-8111-111111111111') then
  raise exception 'Second user crossed USA tenant';
 end if;
end
$$;
reset role;

-- A shared Brazil Auth user WITHOUT a US membership may not access the US area.
set role authenticated;
select pg_catalog.set_config('request.jwt.claim.sub','cccccccc-cccc-4ccc-8ccc-ccccccccccc3',false);
do $$
begin
 if (select count(*) from public.usa_legal_memberships)<>0 or
    (select count(*) from public.usa_legal_research_entitlements)<>0 or
    public.usa_legal_search_consume_quota('11111111-1111-4111-8111-111111111111')
 then raise exception 'No-US-membership identity gained USA access'; end if;
end
$$;
reset role;

set role anon;
do $$
declare denied boolean:=false;
begin
 begin
  perform public.usa_legal_search_consume_quota('11111111-1111-4111-8111-111111111111');
 exception when insufficient_privilege then denied:=true;
 end;
 if not denied then raise exception 'Anonymous quota execution allowed'; end if;
end
$$;
reset role;

do $$
begin
 if (select remaining from public.usa_legal_search_quotas
    where tenant_id='11111111-1111-4111-8111-111111111111')<>0
    or (select remaining from public.usa_legal_search_quotas
    where tenant_id='22222222-2222-4222-8222-222222222222')<>3
 then raise exception 'Quota mutation crossed tenant or failed'; end if;
end
$$;
-- Prime one quota token to test concurrent consumption in a separate CI step.
update public.usa_legal_search_quotas set remaining=1
 where tenant_id='11111111-1111-4111-8111-111111111111';
