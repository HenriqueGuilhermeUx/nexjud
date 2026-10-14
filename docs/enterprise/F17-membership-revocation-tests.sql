-- Disposable PostgreSQL only. Run after F7, F15 and F14.
begin;
insert into auth.users(id) values
 ('88888888-8888-4888-8888-888888888888'),
 ('99999999-9999-4999-8999-999999999999');
insert into public.enterprise_organizations(id,name,created_by) values
 ('cccccccc-0000-4000-8000-000000000003','Revocable tenant','88888888-8888-4888-8888-888888888888');
insert into public.enterprise_memberships(organization_id,user_id,role) values
 ('cccccccc-0000-4000-8000-000000000003','88888888-8888-4888-8888-888888888888','reader');

set local role authenticated;
select set_config('request.jwt.claim.sub','88888888-8888-4888-8888-888888888888',true);
do $$
declare
 n integer;
 blocked boolean := false;
begin
 select count(*) into n from public.enterprise_organizations where name='Revocable tenant';
 if n <> 1 then raise exception 'Active member could not read own organization'; end if;
 begin
   update public.enterprise_organizations set name='Unauthorized change' where name='Revocable tenant';
 exception when insufficient_privilege then blocked := true;
 end;
 if not blocked then raise exception 'Reader unexpectedly updated organization'; end if;
end $$;
reset role;

delete from public.enterprise_memberships
where organization_id='cccccccc-0000-4000-8000-000000000003'
  and user_id='88888888-8888-4888-8888-888888888888';

set local role authenticated;
select set_config('request.jwt.claim.sub','88888888-8888-4888-8888-888888888888',true);
do $$
declare n integer;
begin
 select count(*) into n from public.enterprise_organizations where name='Revocable tenant';
 if n <> 0 then raise exception 'Revoked member retained organization access'; end if;
 select count(*) into n from public.enterprise_memberships;
 if n <> 0 then raise exception 'Revoked member retained membership access'; end if;
end $$;
rollback;
