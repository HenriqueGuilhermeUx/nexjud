-- Disposable PostgreSQL only. Run after F7, F15, F14.
-- Read-only policy intentionally does not give owner/admin direct table writes.
begin;
insert into auth.users(id) values
 ('aaaaaaaa-1111-4111-8111-111111111111'),
 ('bbbbbbbb-1111-4111-8111-111111111111');
insert into public.enterprise_organizations(id,name,created_by) values
 ('cccccccc-1111-4111-8111-111111111111','Role transition tenant','aaaaaaaa-1111-4111-8111-111111111111');
insert into public.enterprise_memberships(organization_id,user_id,role) values
 ('cccccccc-1111-4111-8111-111111111111','aaaaaaaa-1111-4111-8111-111111111111','admin');

set local role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-1111-4111-8111-111111111111',true);
do $$
declare n integer; blocked boolean := false;
begin
 select count(*) into n from public.enterprise_organizations where name='Role transition tenant';
 if n <> 1 then raise exception 'Admin missing organization read'; end if;
 begin
  update public.enterprise_memberships set role='owner' where user_id=auth.uid();
 exception when insufficient_privilege then blocked := true;
 end;
 if not blocked then raise exception 'Admin unexpectedly changed membership via direct SQL'; end if;
end $$;
reset role;

update public.enterprise_memberships
set role='reader'
where organization_id='cccccccc-1111-4111-8111-111111111111'
  and user_id='aaaaaaaa-1111-4111-8111-111111111111';

set local role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-1111-4111-8111-111111111111',true);
do $$
declare n integer; observed_role text;
begin
 select count(*) into n from public.enterprise_organizations where name='Role transition tenant';
 if n <> 1 then raise exception 'Reader lost authorized organization read after downgrade'; end if;
 select role into observed_role from public.enterprise_memberships
 where user_id=auth.uid();
 if observed_role <> 'reader' then raise exception 'Role downgrade not visible to user'; end if;
end $$;
reset role;

delete from public.enterprise_memberships
where organization_id='cccccccc-1111-4111-8111-111111111111'
  and user_id='aaaaaaaa-1111-4111-8111-111111111111';

set local role authenticated;
select set_config('request.jwt.claim.sub','aaaaaaaa-1111-4111-8111-111111111111',true);
do $$
declare n integer;
begin
 select count(*) into n from public.enterprise_organizations;
 if n <> 0 then raise exception 'Revoked downgraded user retained access'; end if;
end $$;
rollback;
