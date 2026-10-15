-- Disposable PostgreSQL ONLY. Run after F7, F14, F15.
begin;
insert into auth.users(id) values
 ('55555555-5555-4555-8555-555555555555'),
 ('66666666-6666-4666-8666-666666666666'),
 ('77777777-7777-4777-8777-777777777777');
insert into public.enterprise_organizations(id,name,created_by) values
 ('aaaaaaaa-0000-4000-8000-000000000001','Tenant A','55555555-5555-4555-8555-555555555555'),
 ('bbbbbbbb-0000-4000-8000-000000000002','Tenant B','66666666-6666-4666-8666-666666666666');
insert into public.enterprise_memberships(organization_id,user_id,role) values
 ('aaaaaaaa-0000-4000-8000-000000000001','55555555-5555-4555-8555-555555555555','owner'),
 ('bbbbbbbb-0000-4000-8000-000000000002','66666666-6666-4666-8666-666666666666','reader');

set local role authenticated;
select set_config('request.jwt.claim.sub','55555555-5555-4555-8555-555555555555',true);
do $$
declare
  n integer;
begin
  select count(*) into n from public.enterprise_organizations;
  if n <> 1 then raise exception 'Tenant A should see exactly one organization, saw %',n; end if;
  select count(*) into n from public.enterprise_memberships;
  if n <> 1 then raise exception 'Tenant A should see exactly own membership, saw %',n; end if;
end $$;

select set_config('request.jwt.claim.sub','66666666-6666-4666-8666-666666666666',true);
do $$
declare n integer;
begin
  select count(*) into n from public.enterprise_organizations;
  if n <> 1 then raise exception 'Tenant B should see exactly one organization, saw %',n; end if;
  select count(*) into n from public.enterprise_memberships;
  if n <> 1 then raise exception 'Tenant B should see exactly own membership, saw %',n; end if;
end $$;

select set_config('request.jwt.claim.sub','77777777-7777-4777-8777-777777777777',true);
do $$
declare n integer;
begin
  select count(*) into n from public.enterprise_organizations;
  if n <> 0 then raise exception 'Non-member saw organizations'; end if;
  select count(*) into n from public.enterprise_memberships;
  if n <> 0 then raise exception 'Non-member saw memberships'; end if;
end $$;
rollback;
